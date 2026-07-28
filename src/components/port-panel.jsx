import { useState, useEffect } from 'react';
import { h } from 'react/hyperscript';
import { PortList } from './port-list.jsx';

export function PortPanel() {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // 加载端口数据
  const loadPorts = async () => {
    setLoading(true);
    try {
      const result = await window.Bridge.getAllPorts();
      setPorts(result);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('加载端口失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadPorts();
  }, []);

  // 自动刷新监听
  useEffect(() => {
    if (!autoRefresh) return;

    const handleUpdate = (newPorts) => {
      setPorts(newPorts);
      setLastUpdate(new Date());
    };

    window.Bridge.onPortsUpdate(handleUpdate);

    return () => {
      window.removeEventListener('ports-update', handleUpdate);
    };
  }, [autoRefresh]);

  // 终止进程
  const handleKillProcess = async (port) => {
    if (!confirm(`确定要终止占用端口 ${port} 的进程吗？`)) {
      return;
    }

    try {
      await window.Bridge.killPortProcess(port);
      // 重新加载端口列表
      await loadPorts();
    } catch (error) {
      console.error('终止进程失败:', error);
      alert(`终止进程失败: ${error}`);
    }
  };

  // 过滤端口
  const filteredPorts = ports.filter(port => {
    if (!filter) return true;

    const searchLower = filter.toLowerCase();
    const portStr = port.port.toString();
    const processName = port.process?.name?.toLowerCase() || '';
    const command = port.process?.command?.toLowerCase() || '';

    return portStr.includes(searchLower) ||
           processName.includes(searchLower) ||
           command.includes(searchLower);
  });

  // 按端口排序
  const sortedPorts = [...filteredPorts].sort((a, b) => a.port - b.port);

  return h('div', { className: 'port-panel' },
    // 控制栏
    h('div', { className: 'controls' },
      h('div', { className: 'control-group' },
        h('button', {
          onClick: loadPorts,
          disabled: loading,
          className: 'btn-primary'
        }, loading ? '加载中...' : '刷新'),
        h('label', { className: 'checkbox-label' },
          h('input', {
            type: 'checkbox',
            checked: autoRefresh,
            onChange: (e) => setAutoRefresh(e.target.checked)
          }),
          '自动刷新 (10秒)'
        )
      ),
      h('div', { className: 'control-group' },
        h('input', {
          type: 'text',
          placeholder: '搜索端口、进程名或命令...',
          value: filter,
          onChange: (e) => setFilter(e.target.value),
          className: 'search-input'
        })
      ),
      h('div', { className: 'stats' },
        h('span', null, `共 ${sortedPorts.length} 个端口`),
        lastUpdate && h('span', { className: 'last-update' },
          `更新于 ${lastUpdate.toLocaleTimeString()}`
        )
      )
    ),

    // 端口列表
    h(PortList, {
      ports: sortedPorts,
      onKillProcess: handleKillProcess
    })
  );
}
