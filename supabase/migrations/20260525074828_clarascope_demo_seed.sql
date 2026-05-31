/*
  # ClaraScope Demo Data Seed

  Inserts realistic demo patients and scans for dashboard visualization.
  All created_by set to NULL for demo purposes (not linked to specific auth user).
*/

-- Demo Patients
INSERT INTO patients (id, patient_code, age, gender, institution, notes, created_by) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'PT-2024-001', 67, 'female', 'City Eye Institute', 'Diabetic patient, 15yr history', NULL),
  ('a1b2c3d4-0001-0001-0001-000000000002', 'PT-2024-002', 54, 'male', 'City Eye Institute', 'Annual screening', NULL),
  ('a1b2c3d4-0001-0001-0001-000000000003', 'PT-2024-003', 72, 'female', 'Regional Hospital', 'Referred for second opinion', NULL),
  ('a1b2c3d4-0001-0001-0001-000000000004', 'PT-2024-004', 43, 'male', 'City Eye Institute', 'High myopia follow-up', NULL),
  ('a1b2c3d4-0001-0001-0001-000000000005', 'PT-2024-005', 61, 'female', 'University Medical', 'Hypertension-related concern', NULL),
  ('a1b2c3d4-0001-0001-0001-000000000006', 'PT-2024-006', 58, 'male', 'City Eye Institute', 'Glaucoma suspect', NULL),
  ('a1b2c3d4-0001-0001-0001-000000000007', 'PT-2024-007', 49, 'female', 'Regional Hospital', 'Routine annual exam', NULL),
  ('a1b2c3d4-0001-0001-0001-000000000008', 'PT-2024-008', 76, 'male', 'University Medical', 'Post cataract surgery follow-up', NULL),
  ('a1b2c3d4-0001-0001-0001-000000000009', 'PT-2024-009', 38, 'female', 'City Eye Institute', 'RVO suspected', NULL),
  ('a1b2c3d4-0001-0001-0001-000000000010', 'PT-2024-010', 65, 'male', 'Regional Hospital', 'Disc anomaly noted', NULL)
ON CONFLICT (id) DO NOTHING;

-- Demo Scans
INSERT INTO scans (id, patient_id, image_url, eye_side, predicted_class, confidence, uncertainty_score, uncertainty_level, all_probabilities, referral_flag, status, created_at) VALUES
  (
    'b1b2c3d4-0001-0001-0001-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '',
    'right',
    'Diabetic Retinopathy',
    0.9120,
    0.0850,
    'low',
    '{"Diabetic Retinopathy":0.9120,"Normal":0.0350,"Hypertensive Retinopathy":0.0210,"Glaucoma":0.0120,"Media Hazy":0.0080,"Myopic Retinopathy":0.0050,"Optic Disc Disorder":0.0040,"Cataract":0.0020,"Retinal Vein Occlusion":0.0010}',
    false,
    'reviewed',
    now() - interval '2 days'
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000002',
    'a1b2c3d4-0001-0001-0001-000000000002',
    '',
    'left',
    'Glaucoma',
    0.7840,
    0.2200,
    'medium',
    '{"Glaucoma":0.7840,"Optic Disc Disorder":0.1200,"Normal":0.0520,"Diabetic Retinopathy":0.0230,"Hypertensive Retinopathy":0.0100,"Media Hazy":0.0060,"Myopic Retinopathy":0.0030,"Cataract":0.0010,"Retinal Vein Occlusion":0.0010}',
    false,
    'pending',
    now() - interval '1 day'
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000003',
    'a1b2c3d4-0001-0001-0001-000000000003',
    '',
    'right',
    'Media Hazy',
    0.6150,
    0.4100,
    'high',
    '{"Media Hazy":0.6150,"Cataract":0.2200,"Normal":0.0800,"Glaucoma":0.0380,"Diabetic Retinopathy":0.0250,"Myopic Retinopathy":0.0100,"Optic Disc Disorder":0.0060,"Hypertensive Retinopathy":0.0040,"Retinal Vein Occlusion":0.0020}',
    true,
    'pending',
    now() - interval '3 hours'
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000004',
    'a1b2c3d4-0001-0001-0001-000000000004',
    '',
    'left',
    'Myopic Retinopathy',
    0.8560,
    0.1200,
    'low',
    '{"Myopic Retinopathy":0.8560,"Normal":0.0850,"Glaucoma":0.0320,"Optic Disc Disorder":0.0150,"Diabetic Retinopathy":0.0060,"Hypertensive Retinopathy":0.0030,"Media Hazy":0.0020,"Cataract":0.0010,"Retinal Vein Occlusion":0.0000}',
    false,
    'signed_off',
    now() - interval '5 days'
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000005',
    'a1b2c3d4-0001-0001-0001-000000000005',
    '',
    'right',
    'Hypertensive Retinopathy',
    0.7200,
    0.2850,
    'medium',
    '{"Hypertensive Retinopathy":0.7200,"Diabetic Retinopathy":0.1300,"Normal":0.0650,"Glaucoma":0.0400,"Retinal Vein Occlusion":0.0220,"Media Hazy":0.0080,"Myopic Retinopathy":0.0040,"Optic Disc Disorder":0.0020,"Cataract":0.0010}',
    false,
    'pending',
    now() - interval '4 hours'
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000006',
    'a1b2c3d4-0001-0001-0001-000000000006',
    '',
    'left',
    'Glaucoma',
    0.5880,
    0.4350,
    'high',
    '{"Glaucoma":0.5880,"Optic Disc Disorder":0.2300,"Normal":0.0900,"Diabetic Retinopathy":0.0480,"Hypertensive Retinopathy":0.0220,"Media Hazy":0.0100,"Myopic Retinopathy":0.0060,"Cataract":0.0040,"Retinal Vein Occlusion":0.0020}',
    true,
    'pending',
    now() - interval '1 hour'
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000007',
    'a1b2c3d4-0001-0001-0001-000000000007',
    '',
    'right',
    'Normal',
    0.9450,
    0.0600,
    'low',
    '{"Normal":0.9450,"Diabetic Retinopathy":0.0280,"Glaucoma":0.0120,"Hypertensive Retinopathy":0.0060,"Myopic Retinopathy":0.0040,"Media Hazy":0.0020,"Optic Disc Disorder":0.0010,"Cataract":0.0010,"Retinal Vein Occlusion":0.0010}',
    false,
    'reviewed',
    now() - interval '2 days'
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000008',
    'a1b2c3d4-0001-0001-0001-000000000008',
    '',
    'right',
    'Cataract',
    0.8920,
    0.0950,
    'low',
    '{"Cataract":0.8920,"Media Hazy":0.0620,"Normal":0.0260,"Glaucoma":0.0120,"Diabetic Retinopathy":0.0040,"Hypertensive Retinopathy":0.0020,"Myopic Retinopathy":0.0010,"Optic Disc Disorder":0.0010,"Retinal Vein Occlusion":0.0000}',
    false,
    'signed_off',
    now() - interval '7 days'
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000009',
    'a1b2c3d4-0001-0001-0001-000000000009',
    '',
    'left',
    'Retinal Vein Occlusion',
    0.6400,
    0.3800,
    'high',
    '{"Retinal Vein Occlusion":0.6400,"Diabetic Retinopathy":0.1800,"Hypertensive Retinopathy":0.1000,"Normal":0.0400,"Glaucoma":0.0200,"Media Hazy":0.0100,"Myopic Retinopathy":0.0050,"Optic Disc Disorder":0.0030,"Cataract":0.0020}',
    true,
    'pending',
    now() - interval '30 minutes'
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000010',
    'a1b2c3d4-0001-0001-0001-000000000010',
    '',
    'right',
    'Optic Disc Disorder',
    0.8100,
    0.1750,
    'medium',
    '{"Optic Disc Disorder":0.8100,"Glaucoma":0.1200,"Normal":0.0450,"Diabetic Retinopathy":0.0120,"Hypertensive Retinopathy":0.0060,"Media Hazy":0.0040,"Myopic Retinopathy":0.0020,"Cataract":0.0010,"Retinal Vein Occlusion":0.0000}',
    false,
    'pending',
    now() - interval '6 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- Demo scan concepts for first scan
INSERT INTO scan_concepts (scan_id, concept_name, confidence, description) VALUES
  ('b1b2c3d4-0001-0001-0001-000000000001', 'Microaneurysms', 0.94, 'Small balloon-like swellings in tiny blood vessels of the retina'),
  ('b1b2c3d4-0001-0001-0001-000000000001', 'Hard Exudates', 0.87, 'Lipid deposits from leaky blood vessels forming bright yellow deposits'),
  ('b1b2c3d4-0001-0001-0001-000000000001', 'Retinal Hemorrhages', 0.82, 'Dot and blot hemorrhages from ruptured microaneurysms'),
  ('b1b2c3d4-0001-0001-0001-000000000001', 'Vessel Tortuosity', 0.71, 'Abnormal twisting and turning of retinal blood vessels'),
  ('b1b2c3d4-0001-0001-0001-000000000002', 'Enlarged Cup-to-Disc Ratio', 0.91, 'Cup diameter is >0.7 of total disc diameter, indicating possible glaucoma'),
  ('b1b2c3d4-0001-0001-0001-000000000002', 'Disc Asymmetry', 0.78, 'Notable difference in cup-to-disc ratio between the two eyes'),
  ('b1b2c3d4-0001-0001-0001-000000000002', 'RNFL Thinning', 0.72, 'Retinal nerve fiber layer appears thinner than normal'),
  ('b1b2c3d4-0001-0001-0001-000000000003', 'Media Opacity', 0.88, 'Significant opacity reducing image clarity and diagnostic confidence'),
  ('b1b2c3d4-0001-0001-0001-000000000003', 'Lens Scatter', 0.75, 'Light scatter from early lens changes contributing to image haze')
ON CONFLICT DO NOTHING;
