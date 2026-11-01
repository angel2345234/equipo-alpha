import { KnowledgeSourceService } from '../modules/knowledge/knowledge-source.service';

async function runTest() {
  try {
    console.log('🧪 Probando creación de fuente de conocimiento (ALP5-001)...');
    
    const createdSource = await KnowledgeSourceService.createSource({
      sourceName: 'Documentación Técnica Alpha',
      owner: 'Equipo de Arquitectura',
      type: 'Confluence',
      sensitivity: 'INTERNAL',
      validityDate: new Date('2027-12-31'),
      permissions: 'ROL_ADMIN, ROL_DEV',
      status: 'ACTIVE',
      originUrl: 'https://confluence.alpha.internal/docs/arquitectura'
    });

    console.log('✅ ¡Fuente registrada exitosamente!');
    console.log(createdSource);

    console.log('\n🔍 Consultando la fuente creada por ID...');
    const fetchedSource = await KnowledgeSourceService.getSourceById(createdSource.id);
    console.log('✅ ¡Fuente obtenida correctamente!');
    console.log(fetchedSource);

  } catch (error) {
    console.error('❌ Error durante la prueba del servicio:', error);
  }
}

runTest();