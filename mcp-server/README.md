# Personal OS para Claude Desktop (MCP)

Deja que Claude Desktop lea y modifique tus **postulaciones** y **portales de trabajo**
(página Empleo). Usa un token personal, así que solo ve los datos de su dueño.

## Instalación

1. En la app: **Configuración → Conexión con Claude Desktop → Crear token**. Cópialo (se muestra una vez).
2. En esta carpeta: `npm install`.
3. En Claude Desktop: **Configuración → Desarrollador → Editar configuración** y agrega:

```json
{
  "mcpServers": {
    "personal-os": {
      "command": "node",
      "args": ["C:\\ruta\\a\\all-in-one-life\\mcp-server\\index.mjs"],
      "env": {
        "POS_URL": "https://all-in-one-life.vercel.app",
        "POS_TOKEN": "pos_…tu token…"
      }
    }
  }
}
```

4. Reinicia Claude Desktop. Aparecen las herramientas de `personal-os`.

## Herramientas

`list_applications`, `add_application`, `update_application`, `delete_application`,
`list_portals`, `add_portal`, `update_portal`, `delete_portal`.

Ejemplo: "Me postulé a Rappi como Desarrollador Backend por Computrabajo, ya me llamaron a entrevista".

## Seguridad

- El token vale como una contraseña de tu cuenta: no lo compartas ni lo subas a git.
- Se revoca desde Configuración y deja de funcionar al instante.
- Un token no puede crear ni revocar otros tokens.
- Cada usuario crea sus propios tokens y solo ve sus datos.
