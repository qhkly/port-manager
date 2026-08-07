(function (root) {
  const locale = {
    code: "en-US",
    label: "English",
    messages: {
      app_title: "Port Manager",
      refresh: "Refresh",
      loading: "Loading...",
      kill: "Kill",
      killing: "Killing...",
      auto_refresh: "Auto refresh (10s)",
      search_placeholder: "Search port, process, directory or note...",
      port_count: "{n} port{s}",
      updated_at: "Updated {time}",
      no_match: "No matching ports found",
      no_data: "No port data",
      load_failed: "Failed to load ports: {error}",
      autorefresh_unavailable: "Auto refresh unavailable: {error}",
      kill_failed: "Failed to kill port {port}: {error}",
      save_note_failed: "Failed to save note: {error}",
      delete_note_failed: "Failed to delete note: {error}",
      confirm_kill: "Kill the process on port {port}?",
      cancel: "Cancel",
      edit_note: "Edit note",
      note_placeholder: "Enter a note...",
      delete: "Delete",
      save: "Save",
      add_note: "Add note",
      click_add_note: "Click to add a note",

      // Table headers
      col_port: "Port",
      col_protocol: "Protocol",
      col_process: "Process",
      col_pid: "PID",
      col_user: "User",
      col_cwd: "Working dir",
      col_note: "Note",
      col_actions: "Actions",

      // Settings
      settings_title: "Settings",
      theme_label: "Theme",
      theme_light: "Light",
      theme_dark: "Dark",
      theme_auto: "System",
      language_label: "Language",
    },
  };
  root.__i18nLocales = root.__i18nLocales || {};
  root.__i18nLocales[locale.code] = locale;
})(window);
