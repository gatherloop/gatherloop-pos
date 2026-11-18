const environments = {
  staging: {
    name: 'Gatherloop KDS Staging',
    slug: 'kds-mobile-staging',
    package: 'com.gatherloop.kds.staging',
    projectId: 'cac271e9-e167-4cb3-8b84-7d6354dd32da',
    googleServicesFile: './firebase/staging/google-services.json',
  },
  production: {
    name: 'Gatherloop KDS',
    slug: 'kds-mobile',
    package: 'com.gatherloop.kds',
    projectId: '09f90f27-c18f-4d14-ba48-d98709bc07e4',
    googleServicesFile: './firebase/production/google-services.json',
  },
};

module.exports = ({ config }) => {
  const environment = process.env.APP_ENV || 'staging';
  const env = environments[environment];

  if (!env) throw new Error(`Unknown APP_ENV: ${environment}`);

  return {
    ...config,
    name: env.name,
    slug: env.slug,
    android: {
      ...config.android,
      package: env.package,
      googleServicesFile: env.googleServicesFile,
    },
    extra: {
      ...config.extra,
      eas: {
        ...config.extra?.eas,
        projectId: env.projectId,
      },
    },
  };
};