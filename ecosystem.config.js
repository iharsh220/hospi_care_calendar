module.exports = {
  apps: [{
    name: 'hospitalcare || calendar_automation',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 12000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 12000
    }
  }]
};