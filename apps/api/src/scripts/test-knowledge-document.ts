import { KnowledgeDocumentService } from '../modules/knowledge/knowledge-document.service';

async function runTest() {
  try {
    console.log('🧪 Probando creación de documento y chunks (ALP5-002)...');

    // Usamos el ID 1 de la fuente que creamos en ALP5-001
    const sourceId = 1;

    const document = await KnowledgeDocumentService.createDocument({
      sourceId,
      title: 'Arquitectura del Sistema Alpha - Guía General',
      author: 'Equipo Core',
      version: '1.1',
      content: 'Este documento describe los fundamentos de la arquitectura de microservicios y bases de datos en Neon para el monorepo equipo-alpha.',
      metadata: { categoria: 'arquitectura', entorno: 'produccion' }
    });

    console.log('✅ ¡Documento creado exitosamente!');
    console.log(document);

    console.log('\n📄 Creando fragmentos (chunks) para el documento...');
    const chunk1 = await KnowledgeDocumentService.createChunk({
      documentId: document.id,
      chunkIndex: 0,
      content: 'Este documento describe los fundamentos de la arquitectura de microservicios.',
      tokenCount: 12
    });

    const chunk2 = await KnowledgeDocumentService.createChunk({
      documentId: document.id,
      chunkIndex: 1,
      content: 'y bases de datos en Neon para el monorepo equipo-alpha.',
      tokenCount: 10
    });

    console.log('✅ Chunks creados exitosamente:', [chunk1.id, chunk2.id]);

    console.log('\n🔍 Consultando documento completo con sus chunks...');
    const fullDoc = await KnowledgeDocumentService.getDocumentWithChunks(document.id);
    console.log(JSON.stringify(fullDoc, null, 2));

  } catch (error) {
    console.error('❌ Error durante la prueba de ALP5-002:', error);
  }
}

runTest();