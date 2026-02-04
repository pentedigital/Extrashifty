import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  client: '@tanstack/react-query',
  input: './openapi.json',
  output: {
    path: './src/client/generated',
    format: 'prettier',
  },
  plugins: [
    '@tanstack/react-query',
    {
      name: '@hey-api/typescript',
      enums: 'javascript',
    },
    {
      name: '@hey-api/sdk',
      asClass: false,
    },
  ],
  services: {
    asClass: false,
  },
  types: {
    enums: 'javascript',
    dates: 'types+transform',
  },
})
