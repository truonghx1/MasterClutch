import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',workers:1,timeout:30000,
  use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1366,height:768},headless:true,trace:'retain-on-failure'},
  projects:[{name:'desktop-chromium',use:{browserName:'chromium',channel:process.platform==='win32'?'msedge':undefined}}],
  webServer:{command:'npm start',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI,timeout:15000}
});
