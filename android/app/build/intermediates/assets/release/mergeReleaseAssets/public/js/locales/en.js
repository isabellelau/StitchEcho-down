// UI strings layer — all interface text
// Stitch/weaving terms live in terms.js; do not redefine them here
// Dynamic parameters use {param} placeholders

export default {
  // ═════════════════════════════════════
  //  Common actions
  // ═════════════════════════════════════
  confirm: 'Confirm',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  edit: 'Edit',
  close: 'Close',
  back: 'Back',
  done: 'Done',
  got_it: 'Got it',
  ok: 'OK',
  select_all: 'Select all',
  clear_all: 'Clear',
  undo: 'Undo',
  restored: 'Restored',
  more_actions: 'More',
  loading: 'Loading…',
  app_name: 'StitchEcho',
  unnamed: 'Untitled',

  // ═════════════════════════════════════
  //  Profile card
  // ═════════════════════════════════════
  profile_default_name: 'Knitter',
  profile_change_avatar: 'Change avatar',
  profile_remove_avatar: 'Remove avatar',
  profile_edit_title: 'Edit nickname',
  profile_edit_placeholder: 'Enter your nickname',
  profile_edit_save: 'Save',

  // ═════════════════════════════════════
  //  Navigation
  // ═════════════════════════════════════
  tab_projects: 'Projects',
  tab_settings: 'Settings',
  nav_back: 'Back',
  nav_settings: 'Settings',

  // ═════════════════════════════════════
  //  Home
  // ═════════════════════════════════════
  home_empty_moti: 'Every stitch matters. Start when you\'re ready.',
  home_today_label: 'Completed Today',
  home_stats_projects: 'Projects',
  home_stats_stitches: 'Total stitches',
  home_stats_focus: 'Focus time',
  home_total_stitches: '{count} sts',
  home_total_projects: '{count} projects',
  home_total_days: '{count} days total',
  home_empty: 'No projects yet. Tap the + button below to create your first project',
  home_archived_section: '📦 Archived',
  home_new_project_btn: '+ New project',

  // ═════════════════════════════════════
  //  Project actions
  // ═════════════════════════════════════
  new_project: 'New project',
  rename_project: 'Rename',
  project_name_placeholder: 'Project name, e.g. Pink Beanie',
  delete_project: 'Delete project',
  delete_project_confirm: 'Delete this project? This cannot be undone.',
  archive: 'Archive',
  unarchive: 'Unarchive',
  archive_confirm: 'Archive "{name}"? It will still appear below and can be unarchived anytime.',
  archived_title: '"{name}" archived',
  set_cover: 'Set cover',
  remove_cover: 'Remove cover',
  add_ref_image: 'Add reference image',
  manage_ref_images: 'Manage reference images',
  ref_images_title: 'Reference images ({n})',
  default_part_title: 'Main',
  toggle_row_terms: 'Switch row/round',

  // ═════════════════════════════════════
  //  Part actions
  // ═════════════════════════════════════
  part_default_name: 'Part {n}',
  add_part: 'New part',
  delete_part: 'Delete part',
  edit_part_name: 'Rename',
  finish_edit_name: 'Done editing',
  delete_part_confirm: 'Delete this part and all its rounds? This cannot be undone.',

  // ═════════════════════════════════════
  //  Round / row actions
  // ═════════════════════════════════════
  note: 'Note',
  cast_on: 'Foundation',
  round_label: '{unit} {n}',
  editing_badge: 'Editing',
  edit_instruction: 'Edit pattern',
  set_as_current: 'Set as current {unit}',
  delete_round: 'Delete this {unit}',
  delete_round_confirm: 'Delete this {unit}?',
  deleted_round: '{unit} deleted',
  round_context_notes: '📝 Custom Notes',
  round_context_insert: '＋ Insert Next Round',
  round_context_delete: '✕ Delete This Round',
  round_notes_title: 'Round Notes',
  round_notes_placeholder: 'Type notes...',
  round_notes_saved: 'Notes saved',
  round_inserted: 'Round inserted',
  deleted_part: 'Part deleted',
  removed_item: 'Row removed',
  add_round_btn: '+R',
  empty_round_hint: 'No stitches yet — tap a stitch button below to start recording',
  empty_instruction_hint: 'No pattern yet. Tap import or start recording.',
  last_round_immersive_hint: 'This is the last round. Exit immersive mode to add a new one.',
  round_count_label: '{total} sts',
  instruction_placeholder: 'e.g. R4: 10(X,V,X)',
  expected_count_hint: 'Pattern defines {parsed} sts. Edit the pattern text directly if needed.',

  // ═════════════════════════════════════
  //  Stitch actions
  // ═════════════════════════════════════
  stitch_n_of_total: 'Stitch {n} of {total}',
  stitch_detail_title: 'Stitch {idx}',
  change_to: 'Change to',
  insert_stitch: 'Insert stitch',
  insert_before: 'Insert before',
  insert_before_sub: 'Before stitch {idx}',
  insert_after: 'Insert after',
  insert_after_sub: 'After stitch {idx}',
  delete_stitch: 'Delete this stitch',
  select_stitch_to_insert: 'Choose a stitch to insert',
  category_basic: 'Basic stitches',
  category_increase: 'Increases',
  category_decrease: 'Decreases',
  category_special: 'Special stitches',
  cat_basic_short: 'Basic',
  cat_increase_short: 'Inc',
  cat_decrease_short: 'Dec',
  cat_special_short: 'Special',
  choose_stitches: 'Choose your stitches',
  customize_hint: 'Tap ✎ to rename or recolor',
  customize_btn: '✎ Customize',
  add_remove_stitches: '+/-',
  add_remove_stitches_title: 'Add or remove stitches',
  new_stitch: '+ New stitch',
  stitch_id_label: 'Abbreviation (e.g. DC3L)',
  stitch_id_placeholder: 'e.g. DC3L',
  stitch_name_label: 'Name',
  stitch_name_placeholder: 'e.g. Triple Crochet',
  name_field: 'Name',
  color_field: 'Color',
  category_field: 'Category',
  reset_default: 'Reset',
  delete_custom_stitch: '🗑 Delete this stitch',
  back_btn: '← Back',
  save_btn: '✓ Save',
  create_btn: '✓ Create',
  start_knitting: 'Start knitting',
  update_config: 'Update',
  stitch_id_required: 'Please enter an abbreviation',
  stitch_id_conflict: 'This ID conflicts with a built-in stitch',
  stitch_id_exists: 'This ID is already in use',
  add_to_global_library: 'Add to my stitch library (available for all projects)',
  delete_custom_stitch_confirm: 'Delete custom stitch "{name}"?',

  // ═════════════════════════════════════
  //  Pattern import
  // ═════════════════════════════════════
  import: 'Import',
  import_pattern: 'Import pattern',
  pattern_placeholder: 'Paste your pattern here, or upload an image to scan…\ne.g.\nR1: 6X\nR2: 6V\nR3: [1X, 1V]*6',
  ocr_button: '📷 Scan image',
  ocr_android_notice: 'OCR on Android is currently experimental. Recognition quality varies by device brand. For important patterns, we recommend using your phone\'s built-in text recognition to copy and paste into StitchEcho.',
  parse_preview: '🔍 Preview',
  pattern_empty_error: 'Please enter a pattern',
  pattern_parse_failed: 'Could not parse anything — check the format and try again',
  parse_confirm_title: '✅ Parsed ({rounds} {unit} · {texts} notes)',
  text_card_badge: 'Note',
  detected_stitches: 'Stitches found: ',
  import_to_empty_hint: 'Will be added to the current empty part',
  confirm_import_start: 'Confirm & start',
  overwrite_part: 'Replace current part',
  overwrite_warning: 'Existing progress will be overwritten',
  import_as_new_part: 'Import as new part',
  import_new_part_hint: 'Keep current progress, create a new section',
  back_to_edit: '← Back',
  add_confirm_round: '＋ Add round manually',
  confirm_round_placeholder: 'e.g. 20X or 5SC',
  new_part_label: 'Part ',
  pattern_synced: 'Pattern synced to ',

  // ═════════════════════════════════════
  //  OCR
  // ═════════════════════════════════════
  ocr_initializing: '⏳ Starting recognition engine…',
  ocr_loading_engine: 'Loading recognition engine…',
  ocr_in_progress: '⏳ Scanning…',
  ocr_in_progress_zero: '⏳ Scanning… 0%',
  ocr_complete: '✅ Scan complete — review the text, then tap Preview',
  ocr_failed: '❌ Scan failed — please type the pattern manually',
  tesseract_load_failed: 'Failed to load Tesseract',
  tesseract_script_failed: 'Failed to load Tesseract script',

  // ═════════════════════════════════════
  //  Voice mode
  // ═════════════════════════════════════
  voice_btn: '🎙 Voice',
  voice_btn_on: '🎙 Listening',
  voice_btn_starting: '🎙 Starting…',
  voice_mic_denied: 'Microphone access was denied',
  voice_not_supported: 'Voice recognition is not supported in this browser',
  voice_mic_denied_settings: 'Microphone access denied — please allow it in your browser settings',
  voice_mic_error: 'Microphone access error',
  voice_start_failed: 'Voice failed to start — please try again',
  voice_tutorial_title: '🎙 Voice Mode Guide',
  voice_tutorial_warning: '📢 Voice Mode uses the microphone to recognize spoken commands while you keep your hands on your work.',
  voice_tutorial_step1_title: '① Turning Voice Mode On / Off',
  voice_tutorial_step1_body: 'Tap the 🎙 Voice button at the bottom of the project screen. Grant microphone permission the first time. The button turns red and pulses when listening. Tap again to turn off. Switching projects or leaving the app does not automatically turn it off.',
  voice_tutorial_step2_title: '② Stitch Commands',
  voice_tutorial_step2_body: 'Say a stitch name to add one stitch. For batch adding, say a number plus the stitch name (e.g. "three double crochet", "five chain").<br><br><table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="color:var(--muted);font-weight:600"><td style="padding:3px 8px;border-bottom:1px solid var(--border)">Say</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">Adds</td></tr><tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">single crochet / sc</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">SC X</td></tr><tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">half double crochet / hdc</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">HDC T</td></tr><tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">double crochet / dc</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">DC F</td></tr><tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">treble / treble crochet / tr</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">TR E</td></tr><tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">chain / chain stitch / ch</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">CH</td></tr><tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">slip stitch / sl st</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">SL</td></tr><tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">increase / inc</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">INC V</td></tr><tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">decrease / dec</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">DEC A</td></tr><tr><td style="padding:3px 8px">skip / skip stitch</td><td style="padding:3px 8px">SK</td></tr></table>',
  voice_tutorial_step3_title: '③ Undo',
  voice_tutorial_step3_body: 'Say "undo" or "go back" to remove the last stitch. One stitch at a time.',
  voice_tutorial_step4_title: '④ Repeat',
  voice_tutorial_step4_body: 'Say "repeat", "again", or "one more" to repeat your last stitch. If the current round has a written pattern, voice asks "One stitch or repeat pattern?" — reply "one stitch" or "pattern".',
  voice_tutorial_step5_title: '⑤ Next Round',
  voice_tutorial_step5_body: 'Say "one more round" or "next round". If the current round has a pattern, voice asks "Repeat this round or new round?" — reply "repeat" or "same" to copy the structure, or "new" or "blank" to create a new empty round. If no pattern exists, a blank round is created immediately.',
  voice_tutorial_step6_title: '⑥ Jump to Round',
  voice_tutorial_step6_body: 'Say "go to round X" to jump directly to that round. For example: "go to round three", "go to round 5".',
  voice_tutorial_step7_title: '⑦ Stitch Markers',
  voice_tutorial_step7_body: 'Say "mark" or "marker". Voice asks "What color?" — reply with a color name to place a marker on the current stitch. Supported colors: red, orange, yellow, green, blue, purple.',
  voice_tutorial_step8_title: '⑧ Voice Settings',
  voice_tutorial_step8_body: 'Go to Settings → Voice Mode to adjust:<br><br><table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="color:var(--muted);font-weight:600"><td style="padding:3px 8px;border-bottom:1px solid var(--border)">Setting</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">Description</td></tr><tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">Auto-enable voice on project</td><td style="padding:3px 8px;border-bottom:1px solid var(--border)">Turns voice mode on automatically when opening any project</td></tr><tr><td style="padding:3px 8px">Voice sound effects</td><td style="padding:3px 8px">Plays a short chime each time a stitch is added</td></tr></table>',
  voice_hint_bar: '🎙 Say a stitch name to add · say "undo" to remove the last one',
  voice_feedback_undo: 'Undone',
  voice_feedback_repeat_clarify: 'One stitch or repeat the pattern?',
  voice_feedback_new_round: 'New round added',
  voice_feedback_repeat_round_clarify: 'Repeat this round or add a new one?',
  voice_feedback_mark_color: 'What color?',
  voice_feedback_marked: 'Marked',
  voice_feedback_copied: 'Copied',
  voice_feedback_goto: 'Round {n}',
  voice_feedback_not_found: 'Not found',
  voice_feedback_cancelled: 'Cancelled',
  voice_tutorial_btn: 'Voice Command Tutorial',
  voice_tutorial_btn_sub: 'View all available commands and tips',
  voice_basic_settings: 'Basic',
  voice_auto_enable: 'Auto-enable voice on project',
  voice_sound_effects: 'Voice sound effects',
  voice_sound_effects_sub: 'Play a chime on successful recognition',
  voice_speak_feedback: 'Voice readback',
  voice_speak_feedback_sub: 'Confirm result after each voice command',
  voice_interaction: 'Interaction',
  voice_wait_timeout: 'Response wait time',
  voice_wait_timeout_sub: 'How long to wait for a reply after saying "mark"',
  voice_repeat_default: '"Repeat" default',
  voice_repeat_default_sub: 'How to handle "repeat" when a pattern exists',
  voice_repeat_ask: 'Ask each time',
  voice_repeat_single: 'Always single stitch',
  voice_repeat_pattern: 'Always full pattern',
  voice_time_label: '{value} sec',

  // ═════════════════════════════════════
  //  Immersive mode
  // ═════════════════════════════════════
  immersive_enter: '⛶ Focus',
  immersive_exit: '⛶ Exit focus',
  immersive_exit_short: '⊡ Exit',
  immersive_undo: '↩ Undo',
  immersive_next_round: 'Next round ›',
  annotator_save_confirm: 'Save annotated image?',
  annotator_saved: 'Annotation saved',
  annotator_exit_confirm: 'You have unsaved annotations. Save before leaving?',
  annotator_exit_title: 'Unsaved changes',
  annotator_discard: 'Discard',
  immersive_edit_blocked: 'Exit focus mode to edit the pattern',

  // ═════════════════════════════════════
  //  Entry choice sheet
  // ═════════════════════════════════════
  entry_choice_title: 'How would you like to start?',
  entry_paste_auto: 'Paste a pattern (auto)',
  entry_paste_auto_sub: 'Automatically detect stitches and get started quickly',
  entry_manual: 'Enter pattern manually',
  entry_manual_sub: 'Tap to input round by round, no original pattern needed',
  entry_skip: 'Skip (use all stitches)',
  entry_stitch_only: 'Skip pattern, pick stitches',
  entry_stitch_only_sub: 'Open stitch setup to manually choose which stitches you need',
  entry_import_share: 'Import shared project',
  entry_import_share_sub: 'Paste shared text from StitchEcho to import a full project',
  entry_free_mode_link: 'Free mode, no pattern →',

  // ═════════════════════════════════════
  //  Settings
  // ═════════════════════════════════════
  settings: 'Settings',
  settings_color: 'Appearance',
  settings_permissions: 'Permissions',
  settings_data: 'Data',
  settings_voice: 'Voice Mode',
  settings_voice_sub: 'Voice commands & tutorial',
  settings_about: 'About',
  settings_language: 'Language / 语言',
  settings_notation: 'Stitch notation',
  settings_notation_desc: 'Independent of UI language; affects stitch name display only',
  settings_show_symbol: 'Show standard symbols (X / V / A)',
  settings_show_symbol_desc: 'When off, only stitch names are shown',
  settings_ui_theme: 'UI theme',
  settings_ui_theme_desc: 'Change the overall look of the app',
  settings_stitch_theme: 'Stitch colors',
  settings_stitch_theme_desc: 'Changes stitch button colors without affecting the rest of the UI',
  settings_stitch_theme_footer: 'Tap ✎ on any stitch button inside a project to customize it',
  theme_morandi: 'Morandi',
  theme_morandi_sub: 'Warm light',
  theme_night: 'Night',
  theme_night_sub: 'Dark & moody',
  theme_system: 'System',
  theme_system_sub: 'Follows your device',
  stitch_theme_warm: 'Warm',
  stitch_theme_warm_sub: 'Morandi warm tones',
  stitch_theme_dark: 'Shadow',
  stitch_theme_dark_sub: 'Cool night tones',
  stitch_theme_float: 'Float',
  stitch_theme_float_sub: 'Soft pastels',
  settings_stitch_assist: 'Stitch assistant',
  settings_stitch_library: 'Stitch library',
  settings_pro_badge: 'PRO',
  settings_permissions_placeholder: 'Microphone, notifications, and other permissions will be configurable here.',
  settings_stats: 'Stats',
  settings_n_projects: '{n} projects',
  settings_stats_text: '{projects} projects · {stitches} stitches total',
  settings_actions: 'Actions',
  settings_export: '📤 Export backup',
  settings_import: '📥 Import backup',
  settings_clear_all: '🗑 Clear all data',
  settings_clear_confirm: 'Delete all data? This cannot be undone.',
  settings_cleared: 'All data cleared',
  settings_install_section: 'Install',
  settings_install_btn: '📲 Add to Home Screen',

  // ═════════════════════════════════════
  //  Data import / export
  // ═════════════════════════════════════
  import_file_error: 'Invalid file format',
  import_missing_projects: 'Missing projects array',
  import_item_missing_fields: 'Project {n} is missing required fields',
  import_confirm: 'Import backup?\n{count} projects found\nYour current {current} projects will be replaced',
  import_success: '✅ Data restored',
  import_failed: '❌ Import failed: ',
  import_read_failed: '❌ Could not read the file',
  storage_quota: 'Storage is full — try removing some cover images',
  storage_usage: '{used} MB / {quota} MB used · consider exporting a backup and cleaning up',
  export_filename: 'StitchEcho_backup_{date}.json',

  // ═════════════════════════════════════
  //  Cover image
  // ═════════════════════════════════════
  cover_save_failed_quota: 'Storage full — cover not saved. Try exporting a backup and cleaning up.',
  cover_save_failed: 'Could not save cover — please try again',
  cover_updated: 'Cover updated',
  cover_process_failed: 'Could not process the image — please try again',
  cover_removed: 'Cover removed',

  // ═════════════════════════════════════
  //  Archive
  // ═════════════════════════════════════
  archive_tip_title: 'Quick tip',
  archive_tip_tutorial: 'Learn more ›',
  archive_pwa_hint: 'Add this page to your Home Screen to open it like an app — faster and distraction-free.',
  archive_no_more_hint: 'Don\'t show this again',
  archive_backup_title: 'Save a backup',
  archive_backup_desc: 'If you ever switch phones or want extra peace of mind, save a backup file. If you only use one device, feel free to skip.',
  archive_download_btn: 'Download backup for "{name}"',
  archive_where_backup: 'Where to find your backup',
  archive_ios_path: 'iPhone: Files app → On My iPhone → Downloads',
  archive_android_path: 'Android: Files app → Downloads',
  archive_backup_tip: 'Tip: send the file to a messaging app you use — easy to retrieve later if you switch devices.',

  // ═════════════════════════════════════
  //  PWA install tutorial
  // ═════════════════════════════════════
  pwa_tutorial_title: 'How to install as an app',
  pwa_ios_title: 'iPhone & iPad (Safari)',
  pwa_ios_step1: '1. Tap the Share button in the Safari toolbar (the square with an arrow pointing up).',
  pwa_ios_step2: '2. Scroll down and tap "Add to Home Screen."',
  pwa_ios_step3: '3. Tap "Add" in the top right corner.',
  pwa_android_title: 'Android (Chrome)',
  pwa_android_step1: '1. Tap the three-dot menu in the top right corner.',
  pwa_android_step2: '2. Tap "Add to Home screen" or "Install app."',
  pwa_android_step3: '3. Follow the on-screen prompt to confirm.',
  pwa_why_title: 'Why install?',
  pwa_why_offline: 'Works offline — open and use the app even without a connection.',
  pwa_why_clean: 'Distraction-free — no browser bars, just your projects.',
  pwa_why_fast: 'Quick launch — tap the icon on your Home Screen, no need to dig through tabs.',

  // ═════════════════════════════════════
  //  Onboarding
  // ═════════════════════════════════════
  onboard_step1_title: 'A home for every project',
  onboard_step1_desc: 'Scarves, sweaters, socks… give each piece its own space, with cover photos and separate sections for different parts.',
  onboard_step2_label: '24 stitches recorded',
  onboard_step2_title: 'Track every stitch',
  onboard_step2_desc: 'Record stitch sequences round by round. Counts are automatic. Import written patterns or scan them with OCR.',
  onboard_step3_title: 'Start your first project',
  onboard_step3_desc: 'Everything is ready. Let\'s get knitting.',
  onboard_next: 'Next',
  onboard_start: 'Let\'s go',

  // ═════════════════════════════════════
  //  Progress / stats
  // ═════════════════════════════════════
  progress_over: '{done} / {expected} sts ({diff} over)',
  progress_normal: '{done} / {expected} sts',
  progress_no_expected: '{done} sts done',
  header_stats: '{parts} parts · {rounds} {unit} · {stitches} sts',
  filter_by_round: 'Only this {unit}',

  // ═════════════════════════════════════
  //  Service Worker
  // ═════════════════════════════════════
  sw_update_ready: 'A new version is ready — refresh to update',
  sw_update_found: '✨ New version available',
  sw_update_refresh: 'Refresh now',

  // ═════════════════════════════════════
  //  Dialog
  // ═════════════════════════════════════
  dialog_confirm_title: 'Confirm',

  // ═════════════════════════════════════
  //  Tap-based instruction editor
  // ═════════════════════════════════════
  instr_editor_kb_toggle: 'Keyboard ⌨',
  instr_editor_tap_toggle: 'Tap ⊞',
  instr_editor_stitches_label: 'Stitches',
  instr_editor_space: 'Space',
  instr_editor_clear_btn: 'Clear',

  // ═════════════════════════════════════
  //  Multi-round instruction editor
  // ═════════════════════════════════════
  multi_round_editor_title: 'Multi-Round Editor',
  multi_round_prev_round: 'Prev',
  multi_round_next_round: 'Next',
  multi_round_nav_indicator: 'Round {n} / {total}',
  multi_round_nav_prev_empty: '—',

  // ═════════════════════════════════════
  //  Share image
  // ═════════════════════════════════════
  share_generate: 'Share card',
  share_preview_title: 'Share preview',
  share_save: 'Save image',
  share_share: 'Share',
  share_saved_hint: 'Image saved — share manually',
  share_include_name: 'Include signature',
  share_total_stitches: 'Stitches',
  share_total_rounds: 'Rounds',

  // ═════════════════════════════════════
  //  Stitch markers
  // ═════════════════════════════════════
  marker_title: 'Stitch marker',
  marker_color: 'Color',
  marker_note: 'Note',
  marker_note_placeholder: 'Note, e.g. left shoulder seam',
  marker_add: '🔖 Add marker',
  marker_edit: '🔖 Edit marker',
  marker_remove: '🗑 Remove marker',
  marker_pos: 'Stitch {n}',
  marker_none: 'No markers in this round',
  marker_review_title: 'Review markers ({count})',
  marker_drift_warning: '⚠️ {n} marker(s) in this round may have shifted',
  marker_drift_check: 'Review',

  // ═════════════════════════════════════
  //  Compound stitches & loop markers
  // ═════════════════════════════════════
  compound_stitch_warning: '⚠️ This stitch contains {count} actions ({stitch}). Please confirm completion before continuing',
  loop_marker_label: 'Loop R{from}-R{to}',
  copy_structure_btn: 'Copy this round\'s structure',
  copy_structure_from: '↻ Copy structure from existing round',
  copy_structure_empty: 'This round has no stitch data',
  copy_loop_structure_done: 'Copied R{from}–R{to} structure, {count} {unit}',
  add_round_sheet_title: 'New {unit}',
  add_round_blank: '+ Blank {unit}',
  resume_progress_title: 'Continue last session?',
  resume_progress_msg: 'Last worked on\nRound {roundNum} · Stitch {stitchIndex}\n{time}',
  resume_continue: 'Continue',
  resume_skip: 'Browse from start',

  // ═════════════════════════════════════
  //  Share pattern
  // ═════════════════════════════════════
  share_pattern_title: 'Share Pattern',
  share_copy_text: 'Copy text pattern',
  share_copied: 'Pattern copied to clipboard',
  share_copy_failed: 'Copy failed, please try again',
  share_pro_required: 'This feature requires Pro. Stay tuned!',
  share_text_footer: 'Open with StitchEcho to count directly',
  import_mode_title: 'Choose import mode',
  import_mode_follow: 'Follow-along mode',
  import_mode_follow_sub: 'Keep the full stitch sequence; counting fills them in',
  import_mode_own: 'As my own project',
  import_mode_own_sub: 'Keep only pattern text; start from scratch',
  imported_project: 'Imported project',

  project_settings: 'Project Settings',
  setting_count_unit: 'Count Unit',
  setting_current_unit: 'Current: {unit}',
  setting_switch_to: 'Switch to {unit}',
  setting_collapse_all: 'Collapse All',
  setting_collapse_all_sub: 'Collapse All Stitches',
  setting_notation_symbol: 'Symbol',
  setting_notation_zh: 'Chinese',
  setting_notation_en_us: 'US English',
  setting_notation_en_uk: 'UK English',
  round_unit: 'Round',
  row_unit: 'Row',
  import_pattern_desc: 'Paste text pattern or use OCR',

  setting_filter_round: 'Filter by Current Round',
  setting_filter_round_sub: 'Hide stitches from other rounds',
  on: 'On',
  off: 'Off',

  mode_select_title: 'Choose Mode',
  mode_normal: 'Standard Mode',
  mode_normal_desc: 'Count every stitch precisely',
  mode_simple: 'Simple Mode',
  mode_simple_desc: 'Mark rows complete, focus on progress',
  simple_complete_row: 'Mark Complete',
  simple_row_done: '✓ Done',
  simple_progress: '{done} / {total} rows done',
  simple_all_done: '🎉 All done!',
  simple_no_instruction: 'No instruction',
  original_instruction_title: 'Original Instruction',
  original_instruction_restore: 'Restore Original',
  switch_mode_title: 'Switch Mode',
  switch_mode_msg: 'Recorded stitches will be preserved but hidden in Simple Mode. Continue?',
};
