# Estructura del frontend

El frontend se organiza por dominio. Cada pantalla, sus componentes exclusivos,
contratos, adaptadores y estilos permanecen juntos para que una modificación no
obligue a buscar archivos dispersos.

```text
src/
├── api/                         Cliente HTTP compartido
├── components/                  Componentes realmente globales
│   ├── app/                     Errores y conectividad
│   ├── chat/                    Chat reutilizado
│   └── layout/                  Navegación administrativa
├── context/
│   ├── color-mode/              Proveedor y contrato de tema
│   ├── sync/                    Proveedor y contrato de sincronización
│   └── whatsapp/                Proveedor y contrato de WhatsApp
├── offline/                     Cola, caché y sincronización PWA
├── pages/
│   ├── admin/                   Bajas, mensajes y órdenes
│   ├── auth/                    Inicio de sesión
│   ├── clientes/                Listado y componentes de clientes
│   ├── cobranza/                Operación móvil de cobranza
│   ├── configuracion/           Configuración, importación y componentes
│   ├── dashboard/               Panel principal
│   ├── finanzas/                Facturas, caja, estadísticas y componentes
│   ├── infraestructura/
│   │   ├── inventario/          Equipos y bodega
│   │   ├── naps/                Cajas NAP y componentes
│   │   ├── olts/                Radar, API, tipos y estilos OLT
│   │   ├── planes/              Planes y formulario
│   │   ├── redes/               Redes IP y formulario
│   │   └── routers/             Routers, formulario y diagnóstico
│   ├── monitoreo/               Mapa de clientes
│   ├── portal/                  Portal público del cliente
│   ├── public/                  Landing y documentación pública
│   ├── technician/              Operación del técnico
│   └── tools/                   Herramientas independientes
├── theme/                       Tokens visuales compartidos
└── types/                       Contratos usados por varios dominios
```

## Reglas de ubicación

- Una pantalla navegable vive en `pages/<dominio>/`.
- Un componente de un solo dominio vive en su carpeta `components/`.
- `components/` en la raíz se reserva para elementos usados por varios
  dominios.
- Los contratos locales se mantienen junto al módulo. Sólo los contratos con
  varios consumidores se colocan en `types/`.
- Los adaptadores exclusivos, como el de OLT, permanecen dentro de su dominio.
- Los imports entre dominios usan el alias `@/`; los imports dentro del mismo
  módulo pueden ser relativos.
- Una ruta URL no depende de la ruta física del archivo. Todas las rutas se
  registran en `App.tsx` mediante carga diferida.

## Ubicaciones frecuentes

| Función | Archivo activo |
| --- | --- |
| Clientes | `pages/clientes/Clientes.tsx` |
| Alta de cliente compartida | `pages/clientes/components/CreateClientModal.tsx` |
| Órdenes de servicio | `pages/admin/orders/Orders.tsx` |
| Importar clientes CSV/Excel | `pages/configuracion/Importar.tsx` |
| Plantillas de cobro | `pages/configuracion/BillingTemplates.tsx` |
| Facturas y pagos | `pages/finanzas/Facturas.tsx` |
| Transacciones | `pages/finanzas/Transacciones.tsx` |
| Routers | `pages/infraestructura/routers/Routers.tsx` |
| Cajas NAP | `pages/infraestructura/naps/CajasNap.tsx` |
| Radar OLT | `pages/infraestructura/olts/OltRadarVsolPage.tsx` |
| Mapa de clientes | `pages/monitoreo/MapaClientes.tsx` |

## Archivos conservados sin consumidor

- `pages/configuracion/components/ImportClientsModal.tsx` es el importador
  legado. El flujo activo es `pages/configuracion/Importar.tsx`.
- `pages/admin/orders/components/CreateOrdenModal.tsx` es un formulario legado;
  Órdenes utiliza actualmente el alta compartida de clientes.
- `pages/infraestructura/olts/legacy/RadarOlt.tsx` es el radar alternativo sin
  ruta. El radar activo es `OltRadarVsolPage.tsx`.
- `pages/public/LandingPage.tsx` y `DocsPage.tsx` están conservados, pero sus
  rutas permanecen deshabilitadas en `App.tsx`.
