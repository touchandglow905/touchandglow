self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (event) => {
  // Ye empty function zaroori hai PWA criteria pass karne ke liye
});