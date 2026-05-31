from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


NUM_CLASSES = 5


def to_bchw(x: torch.Tensor) -> torch.Tensor:
    if x.ndim == 4 and x.shape[-1] > x.shape[1]:
        return x.permute(0, 3, 1, 2).contiguous()
    return x


class QualityEncoder(nn.Module):
    def __init__(self, width: int = 32):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(3, width, 3, stride=2, padding=1),
            nn.BatchNorm2d(width),
            nn.SiLU(inplace=True),
            nn.Conv2d(width, width * 2, 3, stride=2, padding=1),
            nn.BatchNorm2d(width * 2),
            nn.SiLU(inplace=True),
            nn.Conv2d(width * 2, width * 2, 3, stride=2, padding=1),
            nn.BatchNorm2d(width * 2),
            nn.SiLU(inplace=True),
            nn.Conv2d(width * 2, 1, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor, out_hw: tuple[int, int]) -> torch.Tensor:
        return F.interpolate(self.net(x), size=out_hw, mode="bilinear", align_corners=False)


class StableQGCAF(nn.Module):
    def __init__(self, dim: int = 256, heads: int = 4, dropout: float = 0.05):
        super().__init__()
        self.heads = heads
        self.scale = (dim // heads) ** -0.5
        self.q = nn.Linear(dim, dim)
        self.k = nn.Linear(dim, dim)
        self.v = nn.Linear(dim, dim)
        self.proj = nn.Sequential(nn.Linear(dim, dim), nn.Dropout(dropout))

    def forward(self, local: torch.Tensor, global_: torch.Tensor, quality: torch.Tensor) -> torch.Tensor:
        b, c, h, w = local.shape
        l = local.flatten(2).transpose(1, 2)
        g = global_.flatten(2).transpose(1, 2)
        q = self.q(l).reshape(b, -1, self.heads, c // self.heads).transpose(1, 2)
        k = self.k(g).reshape(b, -1, self.heads, c // self.heads).transpose(1, 2)
        v = self.v(g).reshape(b, -1, self.heads, c // self.heads).transpose(1, 2)
        scores = (q @ k.transpose(-2, -1)) * self.scale
        key_quality = quality.flatten(2).clamp(0.05, 1.0).unsqueeze(1)
        scores = scores + torch.log(key_quality)
        attn = torch.softmax(scores, dim=-1)
        out = (attn @ v).transpose(1, 2).reshape(b, -1, c)
        return self.proj(out).transpose(1, 2).reshape(b, c, h, w)


class ClaraVisionChampion(nn.Module):
    def __init__(self, dim: int = 256):
        super().__init__()
        import timm

        self.local = timm.create_model("convnext_tiny", pretrained=False, num_classes=NUM_CLASSES)
        self.global_ = timm.create_model(
            "swin_tiny_patch4_window7_224",
            pretrained=False,
            features_only=True,
            out_indices=(-1,),
        )

        self.local_proj = nn.Conv2d(768, dim, 1)
        self.global_proj = nn.Conv2d(768, dim, 1)
        self.quality = QualityEncoder()
        self.qgcaf = StableQGCAF(dim=dim, heads=4)
        self.delta_head = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.LayerNorm(dim * 3),
            nn.Linear(dim * 3, 512),
            nn.GELU(),
            nn.Dropout(0.25),
            nn.Linear(512, NUM_CLASSES),
        )
        self.concept_head = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.LayerNorm(dim * 3),
            nn.Linear(dim * 3, 11),
        )
        self.delta_scale = nn.Parameter(torch.tensor(0.20))

    def forward(self, x: torch.Tensor):
        local_raw = self.local.forward_features(x)
        base_logits = self.local.forward_head(local_raw)
        global_raw = to_bchw(self.global_(x)[-1])
        local_feat = self.local_proj(local_raw)
        global_feat = self.global_proj(global_raw)
        global_feat = F.interpolate(global_feat, size=local_feat.shape[-2:], mode="bilinear", align_corners=False)
        qmap = self.quality(x, local_feat.shape[-2:])
        cross = self.qgcaf(local_feat, global_feat, qmap)
        fused = torch.cat([local_feat, global_feat, cross], dim=1)
        delta_logits = self.delta_head(fused)
        concept_logits = self.concept_head(fused)
        scale = torch.clamp(self.delta_scale, 0.0, 0.60)
        logits = base_logits + scale * delta_logits
        alpha = F.softplus(logits) + 1.0
        uncertainty = NUM_CLASSES / alpha.sum(dim=1)
        return {
            "logits": logits,
            "base_logits": base_logits,
            "delta_logits": delta_logits,
            "concept_logits": concept_logits,
            "quality": qmap,
            "alpha": alpha,
            "uncertainty": uncertainty,
        }
