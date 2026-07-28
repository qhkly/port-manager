// 使用 React.createElement 创建组件
function PortPanel() {
  const [ports, setPorts] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [lastUpdate, setLastUpdate] = React.useState(null);
  const [killingPort, setKillingPort] = React.useState(null);
  const [confirmPort, setConfirmPort] = React.useState(null);
  const [errorMsg, setErrorMsg] = React.useState('');

  // 加载端口数据
  const loadPorts = async () => {
    setLoading(true);
    try {
      const result = await window.Bridge.getAllPorts();
      setPorts(result);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('加载端口失败:', error);
      setErrorMsg('加载端口失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  React.useEffect(() => {
    loadPorts();
  }, []);

  // 监听后端自动刷新事件
  React.useEffect(() => {
    if (!autoRefresh) return;

    var unlisten = null;
    var cancelled = false;

    window.Bridge.onPortsUpdate(function(newPorts) {
      setPorts(newPorts);
      setLastUpdate(new Date());
    }).then(function(fn) {
      // 订阅完成时若已卸载，立即取消
      if (cancelled) fn(); else unlisten = fn;
    }).catch(function(error) {
      console.error('订阅端口更新失败:', error);
      setErrorMsg('自动刷新不可用: ' + error);
    });

    return function() {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [autoRefresh]);

  // 终止进程：先弹出应用内确认框（webview 的原生 confirm 不可靠）
  const handleKillProcess = (port) => {
    setErrorMsg('');
    setConfirmPort(port);
  };

  const doKillProcess = async (port) => {
    setConfirmPort(null);
    setKillingPort(port);
    try {
      await window.Bridge.killPortProcess(port);
      await loadPorts();
    } catch (error) {
      console.error('终止进程失败:', error);
      setErrorMsg('终止端口 ' + port + ' 失败: ' + error);
    } finally {
      setKillingPort(null);
    }
  };

  // 过滤端口
  const filteredPorts = ports.filter(function(port) {
    if (!filter) return true;

    const searchLower = filter.toLowerCase();
    const portStr = port.port.toString();
    const processName = (port.process && port.process.name) ? port.process.name.toLowerCase() : '';
    const command = (port.process && port.process.command) ? port.process.command.toLowerCase() : '';

    return portStr.indexOf(searchLower) >= 0 ||
           processName.indexOf(searchLower) >= 0 ||
           command.indexOf(searchLower) >= 0;
  });

  // 按端口排序
  const sortedPorts = filteredPorts.slice().sort(function(a, b) {
    return a.port - b.port;
  });

  // 创建表格行
  const portRows = sortedPorts.map(function(port) {
    return React.createElement('tr', { key: port.port + '-' + port.protocol },
      React.createElement('td', { className: 'port-number' }, port.port),
      React.createElement('td', { className: 'protocol' }, port.protocol),
      React.createElement('td', {
        className: 'process-name',
        title: port.process ? port.process.command : ''
      }, (port.process && port.process.name) ? port.process.name : '-'),
      React.createElement('td', { className: 'pid' }, (port.process && port.process.pid) ? port.process.pid : '-'),
      React.createElement('td', { className: 'user' }, (port.process && port.process.user) ? port.process.user : '-'),
      React.createElement('td', { className: 'actions' },
        React.createElement('button', {
          onClick: function() { handleKillProcess(port.port); },
          disabled: killingPort === port.port,
          className: 'btn-danger'
        }, killingPort === port.port ? '终止中...' : '终止')
      )
    );
  });

  // 创建空状态或表格
  let listContent;
  if (sortedPorts.length === 0) {
    var emptyText = loading ? '加载中...' : (filter ? '没有找到匹配的端口' : '暂无端口数据');
    listContent = React.createElement('div', { className: 'empty-state' }, emptyText);
  } else {
    listContent = React.createElement('div', { className: 'port-list-container' },
      React.createElement('table', { className: 'port-list' },
        React.createElement('thead', null,
          React.createElement('tr', null,
            React.createElement('th', null, '端口'),
            React.createElement('th', null, '协议'),
            React.createElement('th', null, '进程名'),
            React.createElement('th', null, 'PID'),
            React.createElement('th', null, '用户'),
            React.createElement('th', null, '操作')
          )
        ),
        React.createElement('tbody', null, portRows)
      )
    );
  }

  // 错误提示条
  const errorBanner = errorMsg
    ? React.createElement('div', { className: 'error-banner' },
        React.createElement('span', null, errorMsg),
        React.createElement('button', {
          className: 'error-close',
          onClick: function() { setErrorMsg(''); }
        }, '×')
      )
    : null;

  // 应用内确认对话框
  const confirmDialog = confirmPort !== null
    ? React.createElement('div', { className: 'modal-overlay', onClick: function() { setConfirmPort(null); } },
        React.createElement('div', {
          className: 'modal',
          onClick: function(e) { e.stopPropagation(); }
        },
          React.createElement('p', { className: 'modal-text' },
            '确定要终止占用端口 ' + confirmPort + ' 的进程吗？'),
          React.createElement('div', { className: 'modal-actions' },
            React.createElement('button', {
              className: 'btn-secondary',
              onClick: function() { setConfirmPort(null); }
            }, '取消'),
            React.createElement('button', {
              className: 'btn-danger',
              onClick: function() { doKillProcess(confirmPort); }
            }, '终止')
          )
        )
      )
    : null;

  return React.createElement('div', { className: 'port-panel' },
    errorBanner,
    confirmDialog,
    // 控制栏
    React.createElement('div', { className: 'controls' },
      React.createElement('div', { className: 'control-group' },
        React.createElement('button', {
          onClick: loadPorts,
          disabled: loading,
          className: 'btn-primary'
        }, loading ? '加载中...' : '刷新'),
        React.createElement('label', { className: 'checkbox-label' },
          React.createElement('input', {
            type: 'checkbox',
            checked: autoRefresh,
            onChange: function(e) { setAutoRefresh(e.target.checked); }
          }),
          '自动刷新 (10秒)'
        )
      ),
      React.createElement('div', { className: 'control-group' },
        React.createElement('input', {
          type: 'text',
          placeholder: '搜索端口、进程名或命令...',
          value: filter,
          onChange: function(e) { setFilter(e.target.value); },
          className: 'search-input'
        })
      ),
      React.createElement('div', { className: 'stats' },
        React.createElement('span', null, '共 ' + sortedPorts.length + ' 个端口'),
        lastUpdate ? React.createElement('span', { className: 'last-update' },
          '更新于 ' + lastUpdate.toLocaleTimeString()
        ) : null
      )
    ),
    // 端口列表
    listContent
  );
}

function App() {
  return React.createElement('div', { className: 'app' },
    React.createElement('header', { className: 'app-header' },
      React.createElement('h1', null, '端口管理器')
    ),
    React.createElement('main', { className: 'app-main' },
      React.createElement(PortPanel, null)
    )
  );
}

// 渲染应用
var root = document.getElementById('app');
ReactDOM.render(React.createElement(App), root);
