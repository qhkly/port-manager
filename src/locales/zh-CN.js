(function (root) {
  const locale = {
    code: "zh-CN",
    label: "中文",
    messages: {
      app_title: "端口管理器",
      refresh: "刷新",
      loading: "加载中...",
      kill: "终止",
      killing: "终止中...",
      auto_refresh: "自动刷新 (10秒)",
      search_placeholder: "搜索端口、进程、目录或备注...",
      port_count: "共 {n} 个端口",
      updated_at: "更新于 {time}",
      no_match: "没有找到匹配的端口",
      no_data: "暂无端口数据",
      load_failed: "加载端口失败: {error}",
      autorefresh_unavailable: "自动刷新不可用: {error}",
      kill_failed: "终止端口 {port} 失败: {error}",
      save_note_failed: "保存备注失败: {error}",
      delete_note_failed: "删除备注失败: {error}",
      confirm_kill: "确定要终止占用端口 {port} 的进程吗？",
      cancel: "取消",
      edit_note: "编辑备注",
      note_placeholder: "输入备注说明...",
      delete: "删除",
      save: "保存",
      add_note: "添加备注",
      click_add_note: "点击添加备注",

      // 表头
      col_port: "端口",
      col_protocol: "协议",
      col_process: "进程名",
      col_pid: "PID",
      col_user: "用户",
      col_cwd: "工作目录",
      col_note: "备注",
      col_actions: "操作",

      // 设置
      settings_title: "设置",
      theme_label: "主题",
      theme_light: "浅色",
      theme_dark: "深色",
      theme_auto: "跟随系统",
      language_label: "语言",
    },
  };
  root.__i18nLocales = root.__i18nLocales || {};
  root.__i18nLocales[locale.code] = locale;
})(window);
