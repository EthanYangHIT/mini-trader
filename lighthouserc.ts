const config = {
  ci: {
    collect: {
      url: [process.env.CI ? 'http://localhost:8080/' : 'http://localhost:8080/mini-trader/'],
      startServerReadyPattern: 'Serving!',
      startServerReadyTimeout: 10000,
      staticDistDir: './dist',
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'max-potential-fid': ['warn', { maxNumericValue: 300 }],
        'categories:accessibility': ['warn', { minScore: 0.7 }],
        'aria-allowed-attr': ['warn', { minScore: 0.5 }],
        'button-name': ['warn', { minScore: 0.5 }],
        'categories:best-practices': ['warn', { minScore: 0.6 }],
        'csp-xss': ['warn', { minScore: 0.1 }],
        'render-blocking-resources': ['warn', { maxLength: 3 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

export default config;
