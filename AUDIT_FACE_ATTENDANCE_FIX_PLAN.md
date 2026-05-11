# SmartAttendance face attendance audit and fix plan

## Findings

- Enrollment face boxes were rendered with raw camera-frame coordinates, which can drift from the preview and make the box appear to run away from faces.
- Enrollment saved a single averaged face vector, so one bad capture could poison the profile.
- The roster screen filtered out students without face vectors, making class members with missing captures invisible.
- The matching threshold was too strict for the current mobile camera/model pipeline.
- Scan review did not clearly show scan time, confidence, and present/absent details per student.

## Planned fixes

- Map camera detection bounds to preview coordinates before drawing overlays.
- Save all five enrollment embeddings for each student and keep the average behavior optional through matching across all saved samples.
- Show the complete class/student roster, including students with zero saved face vectors.
- Lower the threshold and keep debug output visible so Unknown has an explainable reason.
- Improve attendance review with status, confidence, method, and scan time.
