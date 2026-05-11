import {
  FaceMatcher,
  EnrolledEmbedding,
} from '../src/services/faceRecognition/FaceMatcher';

describe("🚀 Simulation de l'IA RegistreIntelligent", () => {
  // 1. On prépare une "base de données" de visages (embeddings de 128 dimensions)
  // On simule Alice avec un vecteur simple pour le test
  const aliceEmbedding = new Float32Array(128).fill(0);
  aliceEmbedding[0] = 1; // Alice a "1" en première position

  const database: EnrolledEmbedding[] = [
    {studentId: 101, embedding: aliceEmbedding}, // Alice Smith
  ];

  test('✅ SCÉNARIO 1 : Alice se présente devant la caméra', () => {
    // Le visage détecté est presque identique à celui en base
    const liveFace = new Float32Array(128).fill(0);
    liveFace[0] = 0.95;
    liveFace[1] = 0.05;

    const result = FaceMatcher.match(liveFace, database);

    console.log(`\n--- Scénario 1 ---`);
    console.log(`Résultat : ${result ? 'Étudiant Identifié !' : 'Inconnu'}`);
    if (result) {
      console.log(`ID Étudiant : ${result.studentId}`);
      console.log(`Confiance : ${(result.confidence * 100).toFixed(2)}%`);
    }

    expect(result?.studentId).toBe(101);
    expect(result?.confidence).toBeGreaterThan(0.9);
  });

  test("⚠️ SCÉNARIO 2 : Quelqu'un qui ressemble vaguement à Alice", () => {
    // Le visage a seulement 60% de ressemblance
    const liveFace = new Float32Array(128).fill(0);
    liveFace[0] = 0.6;
    liveFace[1] = 0.4;

    const result = FaceMatcher.match(liveFace, database);

    console.log(`\n--- Scénario 2 ---`);
    console.log(
      `Résultat : ${
        result ? 'Étudiant Identifié' : 'Inconnu (Seuil non atteint)'
      }`,
    );

    expect(result).toBeNull(); // Doit être rejeté car < 0.75
  });

  test('❌ SCÉNARIO 3 : Un parfait inconnu', () => {
    const strangerFace = new Float32Array(128).fill(0);
    strangerFace[64] = 1; // Complètement différent d'Alice

    const result = FaceMatcher.match(strangerFace, database);

    console.log(`\n--- Scénario 3 ---`);
    console.log(`Résultat : ${result ? 'Identifié' : 'Inconnu'}`);

    expect(result).toBeNull();
  });
});
