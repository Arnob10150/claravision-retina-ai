/**
 * ClaraVision inference client.
 *
 * Set VITE_INFERENCE_API_URL to your Railway/FastAPI service URL.
 * Example: https://your-service.up.railway.app
 */

export type DiseaseClass =
  | 'Diabetic Retinopathy'
  | 'Media Hazy'
  | 'Myopic Retinopathy'
  | 'Optic Disc Disorder'
  | 'Cataract'
  | 'Glaucoma'
  | 'Retinal Vein Occlusion'
  | 'Hypertensive Retinopathy'
  | 'Normal'

export type UncertaintyLevel = 'low' | 'medium' | 'high'

export interface ClinicalConcept {
  name: string
  confidence: number
  description: string
  icon: string
}

export interface DifferentialDiagnosis {
  disease: DiseaseClass
  probability: number
  ruled_out_because: string
}

export interface InferenceResult {
  predicted_class: DiseaseClass
  confidence: number
  uncertainty_score: number
  uncertainty_level: UncertaintyLevel
  all_probabilities: Record<DiseaseClass, number>
  activated_concepts: ClinicalConcept[]
  supporting_reasons: string[]
  differential: DifferentialDiagnosis[]
  referral_flag: boolean
  analysis_id: string
  processing_time_ms: number
}

export interface ScanMetadata {
  age?: number
  gender?: string
  eye_side?: string
}

const DISEASES: DiseaseClass[] = [
  'Diabetic Retinopathy',
  'Media Hazy',
  'Myopic Retinopathy',
  'Optic Disc Disorder',
  'Cataract',
  'Glaucoma',
  'Retinal Vein Occlusion',
  'Hypertensive Retinopathy',
  'Normal',
]

const MODEL_DISEASES: DiseaseClass[] = [
  'Diabetic Retinopathy',
  'Media Hazy',
  'Myopic Retinopathy',
  'Normal',
  'Optic Disc Disorder',
]

const CONCEPT_DESCRIPTIONS: Record<string, string> = {
  Microaneurysms: 'Small capillary outpouchings commonly associated with diabetic retinopathy.',
  Hemorrhages: 'Retinal bleeding patterns that can support vascular pathology.',
  'Hard exudates': 'Lipid deposits caused by vascular leakage.',
  'Media opacity': 'Reduced fundus visibility from optical media haze.',
  'Macular changes': 'Structural macular findings that influence classification.',
  'Cup-to-disc ratio enlargement': 'Optic nerve head finding associated with glaucomatous change.',
  'Optic disc pallor': 'Pale optic disc appearance suggesting optic nerve dysfunction.',
}

const CONCEPT_ICONS: Record<string, string> = {
  Microaneurysms: 'o',
  Hemorrhages: '!',
  'Hard exudates': '*',
  'Media opacity': '~',
  'Macular changes': '+',
  'Cup-to-disc ratio enlargement': 'O',
  'Optic disc pallor': '.',
}

type ApiProbability = { label: string; probability: number }
type ApiConcept = { concept?: string; name?: string; score?: number; confidence?: number; region?: string | null }
type ApiReason = { title?: string; text?: string } | string
type ApiDifferential = {
  label?: string
  disease?: string
  probability: number
  ruledOutBecause?: string
  ruled_out_because?: string
}

type ApiPrediction = {
  predicted_class: string
  confidence: number
  uncertainty_score: number
  uncertainty_level: UncertaintyLevel
  probabilities?: ApiProbability[]
  all_probabilities?: Record<string, number>
  activated_concepts?: ApiConcept[]
  supporting_reasons?: ApiReason[]
  differential?: ApiDifferential[]
  referral_flag: boolean
  model_version?: string
}

function normalizeApiUrl(url: string) {
  return url
    .replace('http://localhost:', 'http://127.0.0.1:')
    .replace(/\/$/, '')
}

function inferenceEndpointUrls() {
  const configured = normalizeApiUrl(
    import.meta.env.VITE_INFERENCE_API_URL
      || import.meta.env.NEXT_PUBLIC_INFERENCE_API_URL
      || 'http://127.0.0.1:8000',
  )

  if (/\/predict$/.test(configured)) return [configured]

  return [
    `${configured}/predict`,
    `${configured}/api/predict`,
  ]
}

function normalizeProbabilities(api: ApiPrediction): Record<DiseaseClass, number> {
  const out = Object.fromEntries(DISEASES.map(disease => [disease, 0])) as Record<DiseaseClass, number>

  if (api.all_probabilities) {
    for (const [label, value] of Object.entries(api.all_probabilities)) {
      if (DISEASES.includes(label as DiseaseClass)) out[label as DiseaseClass] = Number(value)
    }
  }

  for (const item of api.probabilities ?? []) {
    if (DISEASES.includes(item.label as DiseaseClass)) out[item.label as DiseaseClass] = Number(item.probability)
  }

  return out
}

function mapPrediction(api: ApiPrediction, startedAt: number): InferenceResult {
  return {
    predicted_class: api.predicted_class as DiseaseClass,
    confidence: Number(api.confidence),
    uncertainty_score: Number(api.uncertainty_score),
    uncertainty_level: api.uncertainty_level,
    all_probabilities: normalizeProbabilities(api),
    activated_concepts: (api.activated_concepts ?? []).map(item => {
      const name = item.name ?? item.concept ?? 'Model concept'
      return {
        name,
        confidence: Number(item.confidence ?? item.score ?? 0),
        description: CONCEPT_DESCRIPTIONS[name] ?? (item.region ? `Activated around ${item.region}.` : 'Activated by the trained inference model.'),
        icon: CONCEPT_ICONS[name] ?? '+',
      }
    }),
    supporting_reasons: (api.supporting_reasons ?? []).map(reason => typeof reason === 'string' ? reason : reason.text ?? reason.title ?? ''),
    differential: (api.differential ?? []).map(item => ({
      disease: (item.disease ?? item.label ?? 'Normal') as DiseaseClass,
      probability: Number(item.probability),
      ruled_out_because: item.ruled_out_because ?? item.ruledOutBecause ?? 'Lower model posterior than the primary prediction.',
    })),
    referral_flag: Boolean(api.referral_flag),
    analysis_id: `CV-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    processing_time_ms: Date.now() - startedAt,
  }
}

function seededValue(input: string) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function localDemoPrediction(file: File, startedAt: number): InferenceResult {
  const seed = seededValue(`${file.name}:${file.size}:${file.lastModified}`)
  const primaryIndex = seed % MODEL_DISEASES.length
  const secondaryIndex = (primaryIndex + 2) % MODEL_DISEASES.length
  const tertiaryIndex = (primaryIndex + 4) % MODEL_DISEASES.length
  const predicted_class = MODEL_DISEASES[primaryIndex]
  const confidence = 0.72 + ((seed % 18) / 100)
  const secondary = 0.08 + (((seed >> 3) % 9) / 100)
  const tertiary = 0.04 + (((seed >> 5) % 6) / 100)
  const remaining = Math.max(0, 1 - confidence - secondary - tertiary)
  const otherShare = remaining / (MODEL_DISEASES.length - 3)
  const all_probabilities = Object.fromEntries(
    DISEASES.map((disease) => [
      disease,
      disease === MODEL_DISEASES[primaryIndex]
        ? confidence
        : disease === MODEL_DISEASES[secondaryIndex]
          ? secondary
          : disease === MODEL_DISEASES[tertiaryIndex]
            ? tertiary
            : MODEL_DISEASES.includes(disease)
              ? otherShare
              : 0,
    ])
  ) as Record<DiseaseClass, number>
  const uncertainty_score = Math.max(0.08, Math.min(0.42, 1 - confidence))
  const uncertainty_level: UncertaintyLevel = uncertainty_score < 0.18 ? 'low' : uncertainty_score < 0.38 ? 'medium' : 'high'

  return {
    predicted_class,
    confidence,
    uncertainty_score,
    uncertainty_level,
    all_probabilities,
    activated_concepts: [
      'Microaneurysms',
      'Hard exudates',
      'Macular changes',
    ].map((name, index) => ({
      name,
      confidence: Math.max(0.35, confidence - index * 0.09),
      description: CONCEPT_DESCRIPTIONS[name],
      icon: CONCEPT_ICONS[name],
    })),
    supporting_reasons: [
      'Local demo fallback used because the ClaraVision inference API is unavailable.',
      'The result is generated for interface testing and should not be treated as a trained-model diagnosis.',
      'Start or deploy the inference service to enable real ClaraVision-XAI predictions.',
    ],
    differential: [
      {
        disease: MODEL_DISEASES[secondaryIndex],
        probability: secondary,
        ruled_out_because: 'Lower local demo posterior than the primary finding.',
      },
      {
        disease: MODEL_DISEASES[tertiaryIndex],
        probability: tertiary,
        ruled_out_because: 'Lower local demo posterior than the primary finding.',
      },
    ],
    referral_flag: uncertainty_level !== 'low',
    analysis_id: `LOCAL-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    processing_time_ms: Date.now() - startedAt,
  }
}

export async function analyzeImage(file: File, _metadata?: ScanMetadata): Promise<InferenceResult> {
  const startedAt = Date.now()
  const form = new FormData()
  form.append('file', file, file.name || 'fundus-image.jpg')

  for (const endpoint of inferenceEndpointUrls()) {
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        body: form,
      })
    } catch {
      continue
    }

    if (response.ok) {
      return mapPrediction(await response.json() as ApiPrediction, startedAt)
    }

    if (response.status !== 404) break
  }

  return localDemoPrediction(file, startedAt)
}
