describe('Vérification des Assets IA', () => {
  it('doit pouvoir référencer les fichiers modèles', () => {
    const faceDetectionModel = require('../src/assets/models/face_detection.tflite');
    const faceEmbeddingModel = require('../src/assets/models/mobilefacenet.tflite');

    expect(faceDetectionModel).toBeDefined();
    expect(faceEmbeddingModel).toBeDefined();
    console.log('✅ Modèles TFLite correctement référencés par Metro.');
  });
});
