(function () {
  // Tauri 2 API
  function invoke(command, args) {
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      return window.__TAURI__.core.invoke(command, args);
    }
    if (window.__TAURI__ && window.__TAURI__.invoke) {
      return window.__TAURI__.invoke(command, args);
    }
    console.error('Tauri bridge is unavailable');
    console.log('__TAURI__:', window.__TAURI__);
    return Promise.reject(new Error('Tauri bridge is unavailable'));
  }

  // 后端 app.emit() 发出的是 Tauri 事件，不是 DOM 事件，
  // 必须通过 Tauri 的 event.listen 订阅
  function listen(event, handler) {
    if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen) {
      return window.__TAURI__.event.listen(event, handler);
    }
    console.error('Tauri event API is unavailable');
    return Promise.reject(new Error('Tauri event API is unavailable'));
  }

  window.Bridge = {
    // 端口相关命令
    getAllPorts: () => invoke('get_all_ports'),
    killPortProcess: (port) => invoke('kill_port_process', { port }),

    // 进程相关命令
    killProcess: (pid) => invoke('kill_process', { pid }),
    killProcessGroup: (pid) => invoke('kill_process_group', { pid }),

    // 事件监听：返回 Promise<unlisten>
    onPortsUpdate: (callback) => listen('ports-update', (e) => callback(e.payload)),
  };
})();
