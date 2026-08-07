// 使用 React.createElement 创建组件

/* ---------- 通用 SVG 线性图标（stroke 跟随 currentColor） ---------- */
function svgIcon(children, size) {
  return React.createElement('svg', {
    width: size || 16,
    height: size || 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }, children);
}
function Icon(props) {
  var name = props.name, size = props.size;
  var p = function (d, extra) {
    return React.createElement('path', Object.assign({ d: d }, extra || {}));
  };
  switch (name) {
    case 'logo':   // 锚/端口图标
      return svgIcon([p('M12 2v20'), p('M5 8a7 7 0 0 0 14 0'), p('M5 8H3'), p('M21 8h-2')], size);
    case 'refresh':
      return svgIcon([p('M21 12a9 9 0 1 1-3-6.7'), p('M21 3v5h-5')], size);
    case 'search':
      return svgIcon([React.createElement('circle', { key: 'c', cx: 11, cy: 11, r: 7 }), p('M21 21l-4.3-4.3')], size);
    case 'sun':
      return svgIcon([
        React.createElement('circle', { key: 'c', cx: 12, cy: 12, r: 4 }),
        p('M12 2v2'), p('M12 20v2'), p('M4.9 4.9l1.4 1.4'), p('M17.7 17.7l1.4 1.4'),
        p('M2 12h2'), p('M20 12h2'), p('M4.9 19.1l1.4-1.4'), p('M17.7 6.3l1.4-1.4')
      ], size);
    case 'moon':
      return svgIcon([p('M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z')], size);
    case 'monitor':
      return svgIcon([
        React.createElement('rect', { key: 'r', x: 3, y: 4, width: 18, height: 13, rx: 2 }),
        p('M8 21h8'), p('M12 17v4')
      ], size);
    case 'empty':
      return svgIcon([
        React.createElement('circle', { key: 'c', cx: 12, cy: 12, r: 9 }),
        p('M8 12h8')
      ], 40);
    case 'plus':
      return svgIcon([p('M12 5v14'), p('M5 12h14')], size);
    default:
      return null;
  }
}

/* ---------- 订阅语言/主题变化，触发整树重渲染 ---------- */
function useLang() {
  const [lang, setLangState] = React.useState(window.__lang || 'zh-CN');
  React.useEffect(function () {
    const handler = function (e) { setLangState(e.detail.lang); };
    window.addEventListener('i18n:changed', handler);
    return function () { window.removeEventListener('i18n:changed', handler); };
  }, []);
  return lang;
}

function useTheme() {
  const initial = window.theme
    ? { mode: window.theme.mode, resolved: window.theme.resolved }
    : { mode: 'auto', resolved: 'light' };
  const [state, setState] = React.useState(initial);
  React.useEffect(function () {
    const handler = function (e) { setState({ mode: e.detail.mode, resolved: e.detail.resolved }); };
    window.addEventListener('theme:changed', handler);
    return function () { window.removeEventListener('theme:changed', handler); };
  }, []);
  return state;
}

/* ---------- 主题分段控件（浅色 / 深色 / 跟随系统） ---------- */
function ThemeSegment() {
  const theme = useTheme();
  const mode = theme.mode;
  const item = function (value, iconName, labelKey) {
    return React.createElement('button', {
      key: value,
      type: 'button',
      className: 'segment-btn' + (mode === value ? ' on' : ''),
      title: t(labelKey),
      onClick: function () { window.theme.setTheme(value); }
    }, React.createElement(Icon, { name: iconName, size: 14 }));
  };
  return React.createElement('div', { className: 'segment', role: 'group', 'aria-label': t('theme_label') },
    item('light', 'sun', 'theme_light'),
    item('dark', 'moon', 'theme_dark'),
    item('auto', 'monitor', 'theme_auto')
  );
}

/* ---------- 语言开关（中 / EN） ---------- */
function LangToggle() {
  const lang = useLang();
  const opt = function (code, label) {
    return React.createElement('button', {
      key: code,
      type: 'button',
      className: 'segment-btn' + (lang === code ? ' on' : ''),
      onClick: function () { window.i18n.rememberLang(code); }
    }, label);
  };
  return React.createElement('div', { className: 'segment', role: 'group', 'aria-label': t('language_label') },
    opt('zh-CN', '中'),
    opt('en-US', 'EN')
  );
}

/* ---------- 端口面板 ---------- */
function PortPanel(props) {
  // 仅用于在语言切换时触发重渲染。
  useLang();

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
      setErrorMsg(t('load_failed', { error: error }));
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

  // 头部刷新按钮通过 refreshSignal 触发
  React.useEffect(function () {
    if (props.refreshSignal > 0) loadPorts();
  }, [props.refreshSignal]);

  // 监听后端自动刷新事件
  React.useEffect(() => {
    if (!autoRefresh) return;

    var unlisten = null;
    var cancelled = false;

    window.Bridge.onPortsUpdate(function(newPorts) {
      setPorts(newPorts);
      setLastUpdate(new Date());
    }).then(function(fn) {
      if (cancelled) fn(); else unlisten = fn;
    }).catch(function(error) {
      console.error('订阅端口更新失败:', error);
      setErrorMsg(t('autorefresh_unavailable', { error: error }));
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
      setErrorMsg(t('kill_failed', { port: port, error: error }));
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
      setErrorMsg(t('save_note_failed', { error: error }));
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
      setErrorMsg(t('delete_note_failed', { error: error }));
    }
  };

  const openNoteDialog = function(path, cwd) {
    setNoteDialog({ path: path, cwd: cwd });
    setNoteDraft(notes[path] || '');
  };

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

  const sortedPorts = filteredPorts.slice().sort(function(a, b) {
    return a.port - b.port;
  });

  const portRows = sortedPorts.map(function(port) {
    var process = port.process || {};
    var cwd = process.cwd || '-';
    var cwdKey = cwd !== '-' ? cwd : null;
    var currentNote = cwdKey ? (notes[cwdKey] || '') : '';

    return React.createElement('tr', { key: port.port + '-' + port.protocol },
      React.createElement('td', { className: 'port-number' }, port.port),
      React.createElement('td', null, React.createElement('span', { className: 'protocol' }, port.protocol)),
      React.createElement('td', { className: 'process-name', title: process.command || '' }, process.name || '-'),
      React.createElement('td', { className: 'pid' }, process.pid || '-'),
      React.createElement('td', { className: 'user' }, process.user || '-'),
      React.createElement('td', { className: 'cwd', title: cwd },
        cwd.length > 40 ? cwd.substring(0, 37) + '...' : cwd),
      React.createElement('td', { className: 'note-cell' },
        cwdKey
          ? (currentNote
              ? React.createElement('span', { className: 'chip', title: currentNote,
                  onClick: function() { openNoteDialog(cwdKey, cwd); } }, currentNote)
              : React.createElement('span', { className: 'note-empty',
                  onClick: function() { openNoteDialog(cwdKey, cwd); } },
                  React.createElement(Icon, { name: 'plus', size: 12 }), t('add_note')))
          : '-'
      ),
      React.createElement('td', { className: 'actions' },
        React.createElement('button', {
          onClick: function() { handleKillProcess(port.port); },
          disabled: killingPort === port.port,
          className: 'btn-danger-ghost'
        }, killingPort === port.port ? t('killing') : t('kill'))
      )
    );
  });

  const listContent = React.createElement('div', { className: 'port-list-container' },
    sortedPorts.length === 0
      ? React.createElement('div', { className: 'empty-state' },
          React.createElement(Icon, { name: 'empty', size: 40 }),
          React.createElement('p', null, loading ? t('loading') : (filter ? t('no_match') : t('no_data')))
        )
      : React.createElement('table', { className: 'port-list' },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, t('col_port')),
              React.createElement('th', null, t('col_protocol')),
              React.createElement('th', null, t('col_process')),
              React.createElement('th', null, t('col_pid')),
              React.createElement('th', null, t('col_user')),
              React.createElement('th', null, t('col_cwd')),
              React.createElement('th', null, t('col_note')),
              React.createElement('th', null, t('col_actions'))
            )
          ),
          React.createElement('tbody', null, portRows)
        )
  );

  const errorBanner = errorMsg
    ? React.createElement('div', { className: 'error-banner' },
        React.createElement('span', null, errorMsg),
        React.createElement('button', { className: 'error-close',
          onClick: function() { setErrorMsg(''); } }, '×')
      )
    : null;

  const confirmDialog = confirmPort !== null
    ? React.createElement('div', { className: 'modal-overlay', onClick: function() { setConfirmPort(null); } },
        React.createElement('div', { className: 'modal', onClick: function(e) { e.stopPropagation(); } },
          React.createElement('p', { className: 'modal-text' }, t('confirm_kill', { port: confirmPort })),
          React.createElement('div', { className: 'modal-actions' },
            React.createElement('button', { className: 'btn-secondary',
              onClick: function() { setConfirmPort(null); } }, t('cancel')),
            React.createElement('button', { className: 'btn-danger',
              onClick: function() { doKillProcess(confirmPort); } }, t('kill'))
          )
        )
      )
    : null;

  const noteEditDialog = noteDialog !== null
    ? React.createElement('div', { className: 'modal-overlay', onClick: closeNoteDialog },
        React.createElement('div', { className: 'modal note-modal', onClick: function(e) { e.stopPropagation(); } },
          React.createElement('h3', { className: 'modal-title' }, t('edit_note')),
          React.createElement('p', { className: 'modal-subtitle' }, noteDialog.cwd),
          React.createElement('textarea', {
            className: 'note-textarea-large',
            value: noteDraft,
            onChange: function(e) { setNoteDraft(e.target.value); },
            placeholder: t('note_placeholder'),
            maxLength: 200,
            autoFocus: true
          }),
          React.createElement('div', { className: 'char-count' }, (noteDraft || '').length + '/200'),
          React.createElement('div', { className: 'modal-actions' },
            notes[noteDialog.path]
              ? React.createElement('button', { className: 'btn-danger', onClick: handleDeleteNote }, t('delete'))
              : null,
            React.createElement('div', { style: { flex: 1 } }),
            React.createElement('button', { className: 'btn-secondary', onClick: closeNoteDialog }, t('cancel')),
            React.createElement('button', { className: 'btn-primary', onClick: handleSaveNote }, t('save'))
          )
        )
      )
    : null;

  return React.createElement('div', { className: 'port-panel' },
    errorBanner,
    confirmDialog,
    noteEditDialog,
    // 工具栏：搜索 + 自动刷新开关 + 统计
    React.createElement('div', { className: 'controls' },
      React.createElement('label', { className: 'search' },
        React.createElement(Icon, { name: 'search', size: 15 }),
        React.createElement('input', {
          type: 'text',
          placeholder: t('search_placeholder'),
          value: filter,
          onChange: function(e) { setFilter(e.target.value); },
          'aria-label': t('search_placeholder')
        })
      ),
      React.createElement('label', { className: 'switch', title: t('auto_refresh') },
        React.createElement('input', {
          type: 'checkbox',
          checked: autoRefresh,
          onChange: function(e) { setAutoRefresh(e.target.checked); }
        }),
        React.createElement('span', { className: 'toggle' }),
        React.createElement('span', null, t('auto_refresh'))
      ),
      React.createElement('div', { className: 'stats' },
        React.createElement('span', null, t('port_count', { n: sortedPorts.length })),
        lastUpdate ? React.createElement('span', { className: 'last-update' },
          t('updated_at', { time: lastUpdate.toLocaleTimeString() })) : null
      )
    ),
    listContent
  );
}

function App() {
  const [refreshTick, setRefreshTick] = React.useState(0);
  return React.createElement('div', { className: 'app' },
    React.createElement('header', { className: 'app-header' },
      React.createElement('h1', null,
        React.createElement('span', { className: 'logo' }, React.createElement(Icon, { name: 'logo', size: 18 })),
        t('app_title')
      ),
      React.createElement('div', { className: 'header-spacer' }),
      React.createElement('div', { className: 'header-controls' },
        React.createElement(ThemeSegment, null),
        React.createElement(LangToggle, null),
        React.createElement('button', {
          className: 'ibtn',
          title: t('refresh'),
          'aria-label': t('refresh'),
          onClick: function () { setRefreshTick(function (v) { return v + 1; }); }
        }, React.createElement(Icon, { name: 'refresh', size: 16 }))
      )
    ),
    React.createElement('main', { className: 'app-main' },
      React.createElement(PortPanel, { refreshSignal: refreshTick })
    )
  );
}

// 渲染应用
var root = document.getElementById('app');
ReactDOM.render(React.createElement(App), root);
