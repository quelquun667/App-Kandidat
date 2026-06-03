!macro customInit
  ; Vérifie si l'app est déjà installée
  ReadRegStr $0 SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  ${If} $0 != ""
    MessageBox MB_YESNOCANCEL|MB_ICONQUESTION "Kandidat est déjà installé sur cet ordinateur.$\r$\n$\r$\nOui = Désinstaller puis réinstaller$\r$\nNon = Mettre à jour par-dessus$\r$\nAnnuler = Quitter" \
      /SD IDYES IDYES uninst IDNO proceed
    Quit

    uninst:
      ExecWait '"$0" /S'

    proceed:
  ${EndIf}
!macroend

!macro customFinishPage
  !define MUI_FINISHPAGE_TITLE "Installation terminée !"
  !define MUI_FINISHPAGE_TEXT "Kandidat a été installé avec succès.$\r$\n$\r$\nCliquez sur Terminer pour fermer l'assistant."
  !define MUI_FINISHPAGE_RUN "$INSTDIR\Kandidat.exe"
  !define MUI_FINISHPAGE_RUN_TEXT "Lancer Kandidat maintenant"
  !insertmacro MUI_PAGE_FINISH
!macroend
