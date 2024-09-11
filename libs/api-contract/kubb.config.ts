import { defineConfig } from '@kubb/core';
import { pluginOas } from '@kubb/plugin-oas';
import { pluginTanstackQuery } from '@kubb/swagger-tanstack-query';
import { pluginTs } from '@kubb/swagger-ts';
import { pluginClient } from '@kubb/swagger-client';
import { pluginZod } from '@kubb/swagger-zod';

export default defineConfig(() => {
  return [
    {
      root: '.',
      input: {
        path: './src/api.yaml',
      },
      output: {
        path: './src/__generated__/ts',
      },
      plugins: [
        pluginOas({}),
        pluginTs({}),
        pluginTanstackQuery({
          client: {
            importPath: '../../../client',
          },
          query: {
            importPath: '../../../useQuery',
          },
          suspense: false,
        }),
        pluginClient({
          client: {
            importPath: '../../../client',
          },
        }),
        pluginZod({
          output: {
            path: './zod',
          },
        }),
      ],
    },
  ];
});
