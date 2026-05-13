/**
 * Script de migración 1.3: Copiar propietarios existentes a inmueble_propietarios con 100%
 *
 * Escenarios soportados:
 * 1. Si existe un campo propietarioId en la tabla inmueble, crear relación 100%.
 * 2. Si ya existen relaciones en inmueble_propietarios, validar que sumen 100%.
 * 3. Si no hay datos previos, no hace nada (se asume migración manual posterior).
 */

import{PrismaClient}from'@prisma/client';

const prisma=new PrismaClient();

async function main(){
  console.log('[Migración 1.3] Iniciando...');

  // Escenario 1: detectar inmuebles sin relaciones activas
  const inmueblesSinRelacion=await prisma.$queryRaw<Array<{id:number;propietarioId:number|null}>>`
    SELECT i.id, i.propietarioId
    FROM Inmueble i
    LEFT JOIN InmueblePropietario ip ON i.id = ip.inmuebleId AND ip.activo = true
    WHERE ip.inmuebleId IS NULL AND i.propietarioId IS NOT NULL
  `;

  if(inmueblesSinRelacion.length===0){
    console.log('[Migración 1.3] No hay inmuebles sin relación activa. Validando porcentajes existentes...');
  }else{
    console.log(`[Migración 1.3] Encontrados ${inmueblesSinRelacion.length} inmuebles sin relación. Creando con 100%...`);
    for(const inm of inmueblesSinRelacion){
      if(inm.propietarioId){
        await prisma.inmueblePropietario.create({
          data:{
            inmuebleId:inm.id,
            propietarioId:inm.propietarioId,
            porcentaje:100.00,
            activo:true,
          },
        });
        console.log(`  → Inmueble ${inm.id} vinculado a propietario ${inm.propietarioId} al 100%`);
      }
    }
  }

  // Validación: verificar que todos los inmuebles con relaciones activas sumen 100%
  const inmueblesConRelaciones=await prisma.inmueble.findMany({
    include:{propietarios:{where:{activo:true}}},
  });

  let validos=0;
  let invalidos=0;
  for(const inm of inmueblesConRelaciones){
    const suma=inm.propietarios.reduce((acc,p)=>acc+Number(p.porcentaje),0);
    if(Math.abs(suma-100)>0.01){
      console.warn(`  ⚠ Inmueble ${inm.id}: suma de porcentajes = ${suma.toFixed(2)}%`);
      invalidos++;
    }else{
      validos++;
    }
  }

  console.log(`[Migración 1.3] Validación: ${validos} válidos, ${invalidos} con inconsistencias.`);
  console.log('[Migración 1.3] Finalizada.');
}

main()
  .catch(e=>{console.error(e);process.exit(1);})
  .finally(()=>prisma.$disconnect());
