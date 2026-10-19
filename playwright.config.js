import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',fullyParallel:false,workers:1,timeout:30000,
  use:{baseURL:'http://127.0.0.1:5173',headless:true,viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2,trace:'retain-on-failure'},
  projects:[
    {name:'mobile-chromium',use:{browserName:'chromium',channel:process.platform==='win32'?'msedge':undefined}},
    {name:'mobile-webkit',use:{browserName:'webkit'}}
  ],
  webServer:{command:'npm start',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI,timeout:15000}
});
