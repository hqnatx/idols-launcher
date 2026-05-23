#define MyAppName "idols launcher"
#define MyAppPublisher "hqnata"
#define MyAppURL "https://github.com/hqnatx/idols-launcher"

#ifndef MyAppVersion
  #define MyAppVersion "0.0.0"
#endif

#ifndef SourceDir
  #error SourceDir define is required.
#endif

#ifndef ExecutableName
  #define ExecutableName "idols launcher.exe"
#endif

#ifndef OutputDir
  #error OutputDir define is required.
#endif

#ifndef OutputBaseFilename
  #define OutputBaseFilename "idols launcher Setup"
#endif

#ifndef SetupIconFile
  #define SetupIconFile ""
#endif

#ifndef VcRedistPath
  #define VcRedistPath ""
#endif

[Setup]
; Must differ from idols Link {9724e783-b80a-4347-a6dc-7a897f878b15}
AppId={{7e9a4c2d-1f3b-4a5e-8c6d-9e0f1a2b3c4d}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
UninstallDisplayName={#MyAppName}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\idols launcher
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
UsePreviousTasks=no
OutputDir={#OutputDir}
OutputBaseFilename={#OutputBaseFilename}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\{#ExecutableName}
CloseApplications=yes
CloseApplicationsFilter={#ExecutableName},idols_launcher.exe
RestartApplications=no
DisableReadyMemo=yes
#if SetupIconFile != ""
SetupIconFile={#SetupIconFile}
#endif

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
SelectTasksDesc=Which idols launcher setup options should be performed?
SelectTasksLabel2=Select the options you would like Setup to perform while installing idols launcher, then click Next.
ReadyLabel1=Setup is now ready to install idols launcher on your computer.
ReadyLabel2a=Click Install to continue with the installation, or click Back if you want to review any idols launcher setup options.
ReadyLabel2b=Click Install to continue with the installation.

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "Additional options:"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
#if VcRedistPath != ""
Source: "{#VcRedistPath}"; DestDir: "{tmp}"; DestName: "vc_redist.x64.exe"; Flags: deleteafterinstall
#endif

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#ExecutableName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#ExecutableName}"; Tasks: desktopicon

[Run]
#if VcRedistPath != ""
Filename: "{tmp}\vc_redist.x64.exe"; Parameters: "/install /quiet /norestart"; StatusMsg: "Installing Microsoft Visual C++ Runtime..."; Check: NeedsVCRedist; Flags: runhidden waituntilterminated
#endif
Filename: "{app}\{#ExecutableName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  DefenderOptionsPage: TWizardPage;
  DefenderIntroLabel: TNewStaticText;
  DefenderDetailsLabel: TNewStaticText;
  DefenderExclusionsCheckBox: TNewCheckBox;

function IsVCRedistInstalled: Boolean;
var
  Installed: Cardinal;
begin
  Result :=
    RegQueryDWordValue(
      HKLM64,
      'SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64',
      'Installed',
      Installed
    ) and (Installed = 1);

  if not Result then
    Result :=
      RegQueryDWordValue(
        HKLM,
        'SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64',
        'Installed',
        Installed
      ) and (Installed = 1);
end;

function NeedsVCRedist: Boolean;
begin
  Result := not IsVCRedistInstalled;
end;

function PowerShellQuoted(const Value: string): string;
begin
  Result := Value;
  StringChangeEx(Result, '''', '''''', True);
end;

function ShouldApplyDefenderExclusions: Boolean;
begin
  Result :=
    Assigned(DefenderExclusionsCheckBox) and
    DefenderExclusionsCheckBox.Checked;
end;

procedure InitializeWizard;
begin
  DefenderOptionsPage := CreateCustomPage(
    wpSelectDir,
    'Windows Defender',
    'Optional exclusion for the idols launcher install folder.'
  );

  DefenderIntroLabel := TNewStaticText.Create(DefenderOptionsPage);
  DefenderIntroLabel.Parent := DefenderOptionsPage.Surface;
  DefenderIntroLabel.Left := 0;
  DefenderIntroLabel.Top := 0;
  DefenderIntroLabel.Width := DefenderOptionsPage.SurfaceWidth;
  DefenderIntroLabel.AutoSize := False;
  DefenderIntroLabel.WordWrap := True;
  DefenderIntroLabel.Font.Style := [fsBold];
  DefenderIntroLabel.Caption :=
    'You can add the idols launcher folder to Defender exclusions if installs are blocked.';
  WizardForm.AdjustLabelHeight(DefenderIntroLabel);

  DefenderDetailsLabel := TNewStaticText.Create(DefenderOptionsPage);
  DefenderDetailsLabel.Parent := DefenderOptionsPage.Surface;
  DefenderDetailsLabel.Left := 0;
  DefenderDetailsLabel.Top :=
    DefenderIntroLabel.Top + DefenderIntroLabel.Height + ScaleY(12);
  DefenderDetailsLabel.Width := DefenderOptionsPage.SurfaceWidth;
  DefenderDetailsLabel.AutoSize := False;
  DefenderDetailsLabel.WordWrap := True;
  DefenderDetailsLabel.Caption :=
    'Selecting the option below adds the install folder to Windows Defender exclusions. Only enable if you trust idols launcher.';
  WizardForm.AdjustLabelHeight(DefenderDetailsLabel);

  DefenderExclusionsCheckBox := TNewCheckBox.Create(DefenderOptionsPage);
  DefenderExclusionsCheckBox.Parent := DefenderOptionsPage.Surface;
  DefenderExclusionsCheckBox.Left := 0;
  DefenderExclusionsCheckBox.Top :=
    DefenderDetailsLabel.Top + DefenderDetailsLabel.Height + ScaleY(16);
  DefenderExclusionsCheckBox.Width := DefenderOptionsPage.SurfaceWidth;
  DefenderExclusionsCheckBox.Height := ScaleY(24);
  DefenderExclusionsCheckBox.Checked := True;
  DefenderExclusionsCheckBox.Caption :=
    'Add idols launcher install folder to Windows Defender exclusions';
end;

procedure ApplyDefenderExclusions;
var
  ScriptPath: string;
  ScriptContent: string;
  PowerShellExe: string;
  Params: string;
  ResultCode: Integer;
begin
  if WizardSilent then
    Exit;

  ScriptPath := ExpandConstant('{tmp}\idols-launcher-defender-exclusions.ps1');
  ScriptContent :=
    '$ErrorActionPreference = ''Stop'''#13#10 +
    '$Host.UI.RawUI.WindowTitle = ''idols launcher - Defender Exclusions'''#13#10 +
    'try {'#13#10 +
    '  $paths = @(''' +
    PowerShellQuoted(ExpandConstant('{app}')) +
    ''')'#13#10 +
    '  $existing = @((Get-MpPreference).ExclusionPath)'#13#10 +
    '  foreach ($rawPath in $paths) {'#13#10 +
    '    if ([string]::IsNullOrWhiteSpace($rawPath)) { continue }'#13#10 +
    '    $fullPath = [System.IO.Path]::GetFullPath($rawPath)'#13#10 +
    '    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null'#13#10 +
    '    Add-MpPreference -ExclusionPath $fullPath'#13#10 +
    '  }'#13#10 +
    '  exit 0'#13#10 +
    '} catch { exit 1 }'#13#10;

  if not SaveStringToFile(ScriptPath, ScriptContent, False) then
    Exit;

  PowerShellExe := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
  if not FileExists(PowerShellExe) then
    PowerShellExe := 'powershell';

  Params := '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + ScriptPath + '"';
  ShellExec('open', PowerShellExe, Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure _TaskKillImage(const ImageName: string);
var
  ResultCode: Integer;
begin
  if (ImageName = '') then
    Exit;
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/IM "' + ImageName + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /T /IM "' + ImageName + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssInstall) and ShouldApplyDefenderExclusions then
    ApplyDefenderExclusions;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then begin
    _TaskKillImage('{#ExecutableName}');
    if CompareText('{#ExecutableName}', 'idols_launcher.exe') <> 0 then
      _TaskKillImage('idols_launcher.exe');
  end;
end;
