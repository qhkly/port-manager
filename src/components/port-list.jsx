import { h } from 'react/hyperscript';

export function PortList({ ports, onKillProcess }) {
  if (ports.length === 0) {
    return h('div', { className: 'empty-state' },
      h('p', null, '没有找到监听的端口')
    );
  }

  return h('table', { className: 'port-list' },
    h('thead', null,
      h('tr', null,
        h('th', null, '端口'),
        h('th', null, '协议'),
        h('th', null, '进程名'),
        h('th', null, 'PID'),
        h('th', null, '用户'),
        h('th', null, '操作')
      )
    ),
    h('tbody', null,
      ports.map(port =>
        h('tr', { key: `${port.port}-${port.protocol}` },
          h('td', { className: 'port-number' }, port.port),
          h('td', { className: 'protocol' }, port.protocol),
          h('td', { className: 'process-name' },
            port.process?.name || '-'
          ),
          h('td', { className: 'pid' },
            port.process?.pid || '-'
          ),
          h('td', { className: 'user' },
            port.process?.user || '-'
          ),
          h('td', { className: 'actions' },
            h('button', {
              onClick: () => onKillProcess(port.port),
              className: 'btn-danger',
              title: `终止占用端口 ${port.port} 的进程`
            }, '终止')
          )
        )
      )
    )
  );
}
