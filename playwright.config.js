import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({testDir:'./tests',testIgnore:['**/together.spec.js','**/movement.spec.js'],timeout:240000,workers:1,use:{baseURL:'http://127.0.0.1:5173',viewport:{width:960,height:640},launchOptions:{...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']}},webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI}});
