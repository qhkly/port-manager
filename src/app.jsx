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
  const [notes, setNotes] = React.useState({});
  const [noteDialog, setNoteDialog] = React.useState(null);
  const [noteDraft, setNoteDraft] = React.useState('');

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

  // 加载备注
  const loadNotes = async () => {
    try {
      const result = await window.Bridge.getAllNotes();
      setNotes(result);
    } catch (error) {
      console.error('加载备注失败:', error);
    }
  };

  // 初始加载
  React.useEffect(() => {
    loadPorts();
    loadNotes();
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

  // 保存备注
  const handleSaveNote = async () => {
    if (!noteDialog) return;
    try {
      var trimmedNote = noteDraft.trim().slice(0, 200);
      await window.Bridge.saveNote(noteDialog.path, trimmedNote);
      setNotes(function(prev) {
        var newNotes = {};
        for (var k in prev) newNotes[k] = prev[k];
        newNotes[noteDialog.path] = trimmedNote;
        return newNotes;
      });
      setNoteDialog(null);
      setNoteDraft('');
    } catch (error) {
      console.error('保存备注失败:', error);
      setErrorMsg('保存备注失败: ' + error);
    }
  };

  // 删除备注
  const handleDeleteNote = async function() {
    if (!noteDialog) return;
    try {
      await window.Bridge.deleteNote(noteDialog.path);
      setNotes(function(prev) {
        var newNotes = {};
        for (var k in prev) if (k !== noteDialog.path) newNotes[k] = prev[k];
        return newNotes;
      });
      setNoteDialog(null);
    } catch (error) {
      console.error('删除备注失败:', error);
      setErrorMsg('删除备注失败: ' + error);
    }
  };

  // 打开备注编辑对话框
  const openNoteDialog = function(path, cwd) {
    setNoteDialog({ path: path, cwd: cwd });
    setNoteDraft(notes[path] || '');
  };

  // 关闭对话框
  const closeNoteDialog = function() {
    setNoteDialog(null);
    setNoteDraft('');
  };

  // 过滤端口
  const filteredPorts = ports.filter(function(port) {
    if (!filter) return true;

    var searchLower = filter.toLowerCase();
    var portStr = port.port.toString();
    var process = port.process || {};
    var processName = process.name ? process.name.toLowerCase() : '';
    var command = process.command ? process.command.toLowerCase() : '';
    var cwd = process.cwd ? process.cwd.toLowerCase() : '';
    var note = cwd ? (notes[cwd] || '').toLowerCase() : '';

    return portStr.indexOf(searchLower) >= 0 ||
           processName.indexOf(searchLower) >= 0 ||
           command.indexOf(searchLower) >= 0 ||
           cwd.indexOf(searchLower) >= 0 ||
           note.indexOf(searchLower) >= 0;
  });

  // 按端口排序
  const sortedPorts = filteredPorts.slice().sort(function(a, b) {
    return a.port - b.port;
  });

  // 创建表格行
  const portRows = sortedPorts.map(function(port) {
    var process = port.process || {};
    var cwd = process.cwd || '-';
    var cwdKey = cwd !== '-' ? cwd : null;
    var currentNote = cwdKey ? (notes[cwdKey] || '') : '';

    return React.createElement('tr', { key: port.port + '-' + port.protocol },
      React.createElement('td', { className: 'port-number' }, port.port),
      React.createElement('td', { className: 'protocol' }, port.protocol),
      React.createElement('td', {
        className: 'process-name',
        title: process.command || ''
      }, process.name || '-'),
      React.createElement('td', { className: 'pid' }, process.pid || '-'),
      React.createElement('td', { className: 'user' }, process.user || '-'),
      // 工作目录列
      React.createElement('td', {
        className: 'cwd',
        title: cwd
      }, cwd.length > 40 ? cwd.substring(0, 37) + '...' : cwd),
      // 备注列
      React.createElement('td', { className: 'note-cell' },
        cwdKey ? React.createElement('span', {
          className: currentNote ? 'note-content' : 'note-empty',
          onClick: function() { openNoteDialog(cwdKey, cwd); },
          title: currentNote || '点击添加备注'
        }, currentNote || '添加备注') : '-'
      ),
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
  listContent = React.createElement('div', { className: 'port-list-container' },
    sortedPorts.length === 0
      ? React.createElement('div', { className: 'empty-state' },
          loading ? '加载中...' : (filter ? '没有找到匹配的端口' : '暂无端口数据')
        )
      : React.createElement('table', { className: 'port-list' },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, '端口'),
              React.createElement('th', null, '协议'),
              React.createElement('th', null, '进程名'),
              React.createElement('th', null, 'PID'),
              React.createElement('th', null, '用户'),
              React.createElement('th', null, '工作目录'),
              React.createElement('th', null, '备注'),
              React.createElement('th', null, '操作')
            )
          ),
          React.createElement('tbody', null, portRows)
        )
  );

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

  // 备注编辑对话框
  const noteEditDialog = noteDialog !== null
    ? React.createElement('div', { className: 'modal-overlay', onClick: closeNoteDialog },
        React.createElement('div', {
          className: 'modal note-modal',
          onClick: function(e) { e.stopPropagation(); }
        },
          React.createElement('h3', { className: 'modal-title' }, '编辑备注'),
          React.createElement('p', { className: 'modal-subtitle' }, noteDialog.cwd),
          React.createElement('textarea', {
            className: 'note-textarea-large',
            value: noteDraft,
            onChange: function(e) { setNoteDraft(e.target.value); },
            placeholder: '输入备注说明...',
            maxLength: 200,
            autoFocus: true
          }),
          React.createElement('div', { className: 'char-count' },
            (noteDraft || '').length + '/200'
          ),
          React.createElement('div', { className: 'modal-actions' },
            notes[noteDialog.path] ? React.createElement('button', {
              className: 'btn-danger',
              onClick: handleDeleteNote
            }, '删除') : null,
            React.createElement('div', { style: { flex: 1 } }),
            React.createElement('button', {
              className: 'btn-secondary',
              onClick: closeNoteDialog
            }, '取消'),
            React.createElement('button', {
              className: 'btn-primary',
              onClick: handleSaveNote
            }, '保存')
          )
        )
      )
    : null;

  return React.createElement('div', { className: 'port-panel' },
    errorBanner,
    confirmDialog,
    noteEditDialog,
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
          placeholder: '搜索端口、进程、目录或备注...',
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
