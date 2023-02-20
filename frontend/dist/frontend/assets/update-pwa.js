// const version = 14;

// let localVersion = parseInt(localStorage.getItem('version')) || 0;

// if (localVersion !== version) {
//   let shallUpdate = confirm("New Version available, update?");
//   if (shallUpdate) {
//     if ('serviceWorker' in navigator) {
//       navigator.serviceWorker.getRegistrations().then(function (registrations) {
//         for (let registration of registrations) {
//           registration.unregister()
//         }
//         console.log("updated SW's")
//       })
//     }

//     localStorage.setItem('version', version);
//     window.location.reload(true);
//     alert("Update successful!");
//   }
// }