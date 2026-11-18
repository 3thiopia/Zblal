import type { ArcadeGameId, PrizeStatus } from '../arcade/arcadeConfig.ts';
import type { LanguageCode } from './locationTranslations.ts';

export interface ArcadeGameTranslation {
  name: string;
  shortDescription: string;
}

export interface ArcadeTranslations {
  launcherButton: string;
  launcherAriaLabel: string;
  languageLabel: string;
  scoreNotices: {
    registerToSave: string;
    savingScore: string;
    savedLocallyIncomplete: string;
    savedForVerification: string;
    savedNewPersonalBest: string;
    savedToLeaderboard: string;
    syncSkippedPrefix: string;
    savedLocallyOffline: string;
  };
  games: Record<ArcadeGameId, ArcadeGameTranslation>;
  hub: {
    arcadeTitleSuffix: string;
    backToSiteShort: string;
    backToSiteAria: string;
    openProfileAria: string;
    tabs: {
      games: string;
      leaderboards: string;
      ranksShort: string;
      profile: string;
    };
    welcomeBack: (nickname: string) => string;
    profileReady: (nickname: string) => string;
    sessionExpiredNotice: string;
    dismiss: string;
    syncOffline: (error: string) => string;
    retry: string;
    gamesPlayedFraction: (played: number, total: number) => string;
    switchPlayer: string;
    switchShort: string;
    yourBestScores: string;
    bestPrefix: string;
    play: string;
    ranks: string;
    comingSoon: string;
    soon: string;
    dailyDefault: string;
    weeklyDefault: string;
    loading: string;
    live: string;
    ended: string;
    tapDailyRanks: string;
    tapWeeklyPrizes: string;
    viewLeaderboardAria: (gameName: string) => string;
  };
  registration: {
    cardKicker: string;
    returningTitle: string;
    newPlayerTitle: string;
    entryModeAria: string;
    tabNewPlayer: string;
    tabReturningPlayer: string;
    returningSubtitle: string;
    newPlayerSubtitle: string;
    nicknameLabel: string;
    nicknamePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    phoneHelp: string;
    errInvalidPhone: string;
    errInvalidNickname: string;
    errSaveProfile: string;
    errFindProfile: string;
    errInvalidServerProfile: string;
    errNotFoundForPhone: string;
    errSuspendedProfile: string;
    createFromLoginCta: string;
    backToSite: string;
    restoring: string;
    saving: string;
    restoreAndPlay: string;
    createAndPlay: string;
    noOtpTitle: string;
    noOtpDetail1: string;
    noOtpDetail2: string;
  };
  leaderboard: {
    overallTab: string;
    periodDaily: string;
    periodWeekly: string;
    periodAllTime: string;
    dailyChallenge: string;
    weeklyChallenge: string;
    dailyPrizeFallback: string;
    weeklyPrizeFallback: string;
    endsPrefix: string;
    midnightEat: string;
    sundayMidnightEat: string;
    refreshAria: string;
    yourRank: string;
    loadingOverall: string;
    loadingGame: string;
    tryAgain: string;
    noScoresTitle: string;
    noScoresSubtitle: (periodLabel: string) => string;
    rank1Label: string;
    rank2Label: string;
    rank3Label: string;
    youBadge: string;
    youParen: string;
    pointsLabel: string;
    bestLabel: string;
    bestScoreLabel: string;
    ptsUnit: string;
    tableRank: string;
    tablePlayer: string;
    tablePhone: string;
    tableTotalPoints: string;
    tableBestScore: string;
    howRankingsWork: string;
    rankingsExplanationPrefix: string;
    rankingsExplanationStrong: string;
    rankingsExplanationSuffix: string;
    placementRanks: [string, string, string, string, string];
    sixthPlusZero: string;
    recentApprovedWinners: string;
    winnerVerificationInProgress: string;
    overallChampion: string;
    gameWinner: string;
    prizeLabel: string;
    prizeStatuses: Record<PrizeStatus, string>;
  };
  shell: {
    backToGamesShort: string;
    backToGamesAria: string;
    unmuteAria: string;
    muteAria: string;
    resume: string;
    pause: string;
    restart: string;
    resumeAria: string;
    pauseAria: string;
    restartAria: string;
  };
  common: {
    scoreHud: string;
    bestHud: string;
    levelHud: string;
    livesHud: string;
    chancesHud: string;
    startGame: string;
    gamePaused: string;
    resume: string;
    restart: string;
    backToGames: string;
    playAgain: string;
    gameOver: string;
    newPersonalBest: string;
    scoreLabel: string;
    bestLabel: string;
    pauseLegendSpaceP: string;
    pauseLegendP: string;
    restartLegendR: string;
    backLegendEsc: string;
    livesRemainingAria: (lives: number) => string;
    chancesRemainingAria: (chances: number) => string;
  };
  poopMan: {
    title: string;
    ariaLabel: string;
    description: string;
    mobileHint: string;
    desktopHint: string;
    legendMove: string;
    moveUpAria: string;
    moveLeftAria: string;
    moveDownAria: string;
    moveRightAria: string;
    levelClearedBonus: (level: number, bonus: number) => string;
    victoryHeading: string;
    victoryBody: string;
    nextLevel: string;
    cloggedOutLevel: (level: number) => string;
    niceRun: (nickname?: string) => string;
  };
  toiletBasketball: {
    title: string;
    ariaLabel: string;
    mobileHint: string;
    legendAim: string;
    legendSwish: string;
    streak: (n: number) => string;
    wind: string;
    roundComplete: string;
    niceShooting: (nickname?: string) => string;
    madeLabel: string;
    brickLeftCallout: (remaining: number) => string;
    gameOverCallout: string;
    swishCallout: (pts: number) => string;
    splashCallout: (pts: number) => string;
  };
  poopDrop: {
    title: string;
    ariaLabel: string;
    description: string;
    mobileHint: string;
    desktopHint: string;
    legendMove: string;
    streak: (combo: number, mult: number) => string;
    leftBtn: string;
    rightBtn: string;
    moveLeftAria: string;
    moveRightAria: string;
    bucketFull: string;
    niceCatching: (nickname?: string) => string;
    caughtLabel: string;
    oopsCallout: string;
    splatCallout: string;
    goldCallout: (pts: number) => string;
  };
  poopRun: {
    title: string;
    ariaLabel: string;
    description: string;
    mobileHint: string;
    desktopHint: string;
    legendJump: string;
    legendSlide: string;
    distHud: string;
    rollsHud: string;
    speedSuffix: string;
    slideBtn: string;
    jumpBtn: string;
    startRun: string;
    runPaused: string;
    sprintComplete: (meters: number) => string;
    greatSprint: (nickname?: string) => string;
    wipedOut: string;
    rollsLabel: string;
    duckCallout: string;
    shieldCallout: (pts: number) => string;
    shieldSavedCallout: string;
  };
  dontDrop: {
    title: string;
    ariaLabel: string;
    description: string;
    mobileHint: string;
    desktopHint: string;
    legendBounce: string;
    gatesHud: string;
    tapToBounce: string;
    startBouncing: string;
    gatesClearedLabel: (gates: number) => string;
    niceFlying: (nickname?: string) => string;
    dropped: string;
    gatesLabel: string;
    gatesMilestoneCallout: (gates: number) => string;
    goldBonusCallout: string;
  };
}

export const ARCADE_TRANSLATIONS: Record<LanguageCode, ArcadeTranslations> = {
  AM: {
    launcherButton: 'ፖፕ ማን ይጫወቱ',
    launcherAriaLabel: 'የዝብላል ፖፕ ማን ጨዋታዎችን ይክፈቱ',
    languageLabel: 'ቋንቋ',
    scoreNotices: {
      registerToSave: 'ነጥብዎን በደረጃ ሰንጠረዥ ላይ ለማስቀመጥ መገለጫ ይፍጠሩ።',
      savingScore: 'ነጥብ ወደ ደረጃ ሰንጠረዥ በመላክ ላይ...',
      savedLocallyIncomplete: 'በመሳሪያው ላይ ተቀምጧል (ያልተሟላ የሰርቨር ምላሽ)።',
      savedForVerification: 'ነጥብዎ ለማረጋገጫ ተቀምጧል።',
      savedNewPersonalBest: 'አዲስ የግል ምርጥ ነጥብ በውድድር ሰንጠረዥ ላይ ተመዝግቧል!',
      savedToLeaderboard: 'ነጥብዎ በውድድር ሰንጠረዥ ላይ ተመዝግቧል።',
      syncSkippedPrefix: 'የሰንጠረዥ ማመሳሰል አልተቻለም፦',
      savedLocallyOffline: 'በመሳሪያው ላይ ተቀምጧል (ሰንጠረዥ አሁን አይገኝም)።',
    },
    games: {
      'poop-man': {
        name: 'ፖፕ ማን',
        shortDescription:
          'የመስመር ውስጥ ጀብዱ! ሁሉንም የሽንት ቤት ወረቀቶች ይሰብስቡ፣ ለፍጥነት ወርቃማ ወረቀት ይያዙ እና ጀርሞችን ያምልጡ!',
      },
      'toilet-basketball': {
        name: 'የመጸዳጃ ቅርጫት ኳስ',
        shortDescription:
          'ኳሱን ወደኋላ ጎትተው ያነጣጥሩ እና 3 ጊዜ ሳይስቱ ፖፑን ወደ መጸዳጃ ቅርጫቱ ውስጥ ይክተቱ!',
      },
      'poop-drop': {
        name: 'ፖፕ ድሮፕ',
        shortDescription:
          'የመጸዳጃ ባልዲዎን በማንሸራተት የሚወድቁ ፖፖችንና ወርቃማ ወረቀቶችን ይያዙ፤ ጀርምና መፍቻ ያምልጡ!',
      },
      'poop-run': {
        name: 'ፖፕ ሩጫ',
        shortDescription:
          'ማለቂያ የሌለው የመታጠቢያ ቤት ሩጫ — መወጠሪያዎችን ይዝለሉ፣ ከቱቦዎች በታች ይሽሎክሎኩ፣ ወረቀት ይሰብስቡ!',
      },
      'dont-drop-the-poop': {
        name: 'ፖፑን አትጣል',
        shortDescription:
          'በመንካት ፖፑን በአየር ላይ ያንሳፍፉ እና በመታጠቢያ ቤት ቱቦዎች መካከል እየሾለኩ ይለፉ!',
      },
    },
    hub: {
      arcadeTitleSuffix: 'አርኬድ',
      backToSiteShort: 'ዋና ገጽ',
      backToSiteAria: 'ወደ ዝብላል ዋና ድረ-ገጽ ተመለስ',
      openProfileAria: 'የተጫዋች መገለጫ ክፈት',
      tabs: {
        games: 'ጨዋታዎች',
        leaderboards: 'ደረጃ ሰንጠረዥ',
        ranksShort: 'ደረጃዎች',
        profile: 'መገለጫ',
      },
      welcomeBack: (nickname) => `እንኳን በደህና ተመለሱ፣ ${nickname}!`,
      profileReady: (nickname) => `የተጫዋች መገለጫ ዝግጁ ነው፦ ${nickname}`,
      sessionExpiredNotice:
        'የቀድሞው ክፍለ ጊዜ አብቅቷል። ለመመለስ ወይም ለመመዝገብ ስልክ ቁጥርዎን ያስገቡ።',
      dismiss: 'ዝጋ',
      syncOffline: (error) =>
        `የሰንጠረዥ ግንኙነት ተቋርጧል (${error})። አሁንም ሁሉንም ጨዋታዎች መጫወት ይችላሉ።`,
      retry: 'እንደገና ሞክር',
      gamesPlayedFraction: (played, total) => `${played}/${total} ጨዋታዎች ተጫውተዋል`,
      switchPlayer: 'ተጫዋች ቀይር',
      switchShort: 'ቀይር',
      yourBestScores: 'የእርስዎ ምርጥ ነጥቦች',
      bestPrefix: 'ምርጥ፦',
      play: 'ተጫወት',
      ranks: 'ደረጃ',
      comingSoon: 'በቅርቡ ይመጣል',
      soon: 'በቅርቡ',
      dailyDefault: 'ዕለታዊ',
      weeklyDefault: 'ሳምንታዊ',
      loading: 'በመጫን ላይ...',
      live: 'ቀጥታ',
      ended: 'ተጠናቋል',
      tapDailyRanks: 'ዕለታዊ ደረጃዎችን ለማየት ይንኩ',
      tapWeeklyPrizes: 'ሳምንታዊ ሽልማቶችን ለማየት ይንኩ',
      viewLeaderboardAria: (gameName) => `የ${gameName} ደረጃ ሰንጠረዥ ይመልከቱ`,
    },
    registration: {
      cardKicker: 'የዝብላል አርኬድ የተጫዋች ካርድ',
      returningTitle: 'ነባር ተጫዋች',
      newPlayerTitle: 'አዲስ ተጫዋች ምዝገባ',
      entryModeAria: 'የተጫዋች መግቢያ አማራጭ',
      tabNewPlayer: 'አዲስ ተጫዋች',
      tabReturningPlayer: 'ነባር ተጫዋች',
      returningSubtitle:
        'ቅጽል ስምዎን፣ መለያ ቁጥርዎን እና የተቀመጡ ከፍተኛ ነጥቦችዎን ወዲያውኑ ለመመለስ የኢትዮጵያ ሞባይል ቁጥርዎን ብቻ ያስገቡ።',
      newPlayerSubtitle:
        'አንድ ጊዜ ቅጽል ስም እና የኢትዮጵያ ሞባይል ቁጥር ይምረጡ። ቋሚ መለያዎ በ5ቱም ጨዋታዎች ነጥብዎን ይይዛል።',
      nicknameLabel: 'የተጫዋች ቅጽል ስም',
      nicknamePlaceholder: 'ለምሳሌ፦ PipeKing99',
      phoneLabel: 'የኢትዮጵያ ሞባይል ቁጥር',
      phonePlaceholder: '0911 223 344 ወይም +251 911 223 344',
      phoneHelp:
        'ወደ +251 ይቀየራል። በህዝብ ሰንጠረዥ ላይ የተሸፈነ ቁጥር ብቻ ይታያል (+251 9•• ••• 123)።',
      errInvalidPhone:
        'ትክክለኛ የኢትዮጵያ ሞባይል ቁጥር ያስገቡ (ለምሳሌ 0911223344 ወይም +251911223344)።',
      errInvalidNickname: 'ከ2 እስከ 24 ፊደላት ያለው ቅጽል ስም ያስገቡ።',
      errSaveProfile: 'የተጫዋች መገለጫ ማስቀመጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
      errFindProfile: 'የተጫዋች መገለጫ ማግኘት አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
      errInvalidServerProfile: 'ሰርቨሩ ያልተሟላ መገለጫ መልሷል። እባክዎ እንደገና ይሞክሩ።',
      errNotFoundForPhone:
        'በዚህ ስልክ ቁጥር የተመዘገበ የአርኬድ መገለጫ አልተገኘም። ለመመዝገብ ወደ አዲስ ተጫዋች ይቀይሩ።',
      errSuspendedProfile: 'ይህ የተጫዋች መገለጫ ታግዷል። እባክዎ የድጋፍ ክፍሉን ያነጋግሩ።',
      createFromLoginCta: 'በዚህ ቁጥር አዲስ መገለጫ ፍጠር',
      backToSite: 'ወደ ዋና ገጽ',
      restoring: 'መገለጫ በመመለስ ላይ...',
      saving: 'መገለጫ በማስቀመጥ ላይ...',
      restoreAndPlay: 'መልስና ተጫወት',
      createAndPlay: 'መገለጫ ፍጠርና ተጫወት',
      noOtpTitle: 'OTP አያስፈልግም · በነጻ ይጫወቱ እና ያሸንፉ',
      noOtpDetail1:
        'SMS፣ OTP ወይም የይለፍ ቃል አያስፈልግም። ነባር ተጫዋቾች ስማቸውንና ነጥባቸውን ለመመለስ የኢትዮጵያ ሞባይል ቁጥራቸውን ብቻ ያስገባሉ።',
      noOtpDetail2:
        'ነጻ ተሳትፎ · ግዢ አያስፈልግም · ሽልማት ከመረጋገጡ በፊት ነጥቦች ይመረመራሉ፤ ከ18 ዓመት በታች የሆኑ ተጫዋቾች የወላጅ ፈቃድ ያስፈልጋቸዋል።',
    },
    leaderboard: {
      overallTab: 'አጠቃላይ',
      periodDaily: 'ዕለታዊ',
      periodWeekly: 'ሳምንታዊ',
      periodAllTime: 'የሁልጊዜ',
      dailyChallenge: 'ዕለታዊ ውድድር',
      weeklyChallenge: 'ሳምንታዊ ውድድር',
      dailyPrizeFallback: 'ዕለታዊ አጠቃላይ አሸናፊ እና የየጨዋታው መሪዎች በዝብላል ይረጋገጣሉ።',
      weeklyPrizeFallback: 'ውድድሩ ሲጠናቀቅ ሳምንታዊ አሸናፊዎች እና የጨዋታ መሪዎች ይገመገማሉ።',
      endsPrefix: 'የሚያበቃው፦',
      midnightEat: 'እኩለ ሌሊት (EAT)',
      sundayMidnightEat: 'እሁድ እኩለ ሌሊት (EAT)',
      refreshAria: 'ደረጃ ሰንጠረዥ አድስ',
      yourRank: 'የእርስዎ ደረጃ፦',
      loadingOverall: 'አጠቃላይ ደረጃዎች በመጫን ላይ...',
      loadingGame: 'የጨዋታው ደረጃዎች በመጫን ላይ...',
      tryAgain: 'እንደገና ሞክር',
      noScoresTitle: 'ገና የተመዘገበ ትክክለኛ ነጥብ የለም',
      noScoresSubtitle: (periodLabel) =>
        `በ${periodLabel} ሰንጠረዥ ላይ የመጀመሪያው ተጫዋች ይሁኑ! 1ኛ ለመሆን ማንኛውንም የዝብላል ጨዋታ ይጫወቱ።`,
      rank1Label: '1ኛ',
      rank2Label: '2ኛ',
      rank3Label: '3ኛ',
      youBadge: 'እርስዎ',
      youParen: '(እርስዎ)',
      pointsLabel: 'ነጥብ',
      bestLabel: 'ምርጥ',
      bestScoreLabel: 'ምርጥ ነጥብ',
      ptsUnit: 'ነጥብ',
      tableRank: 'ደረጃ',
      tablePlayer: 'ተጫዋች',
      tablePhone: 'ስልክ',
      tableTotalPoints: 'ጠቅላላ ነጥብ',
      tableBestScore: 'ምርጥ ነጥብ',
      howRankingsWork: 'ደረጃ እና አጠቃላይ ነጥብ እንዴት ይሰላል',
      rankingsExplanationPrefix: 'እያንዳንዱ ጨዋታ ተጫዋቾችን በ',
      rankingsExplanationStrong: 'ከፍተኛው ትክክለኛ ነጠላ ጨዋታቸው',
      rankingsExplanationSuffix:
        ' መሰረት ያደረጃል (እኩል ሲሆኑ ቀድሞ ያስመዘገበ ይቀድማል)። አጠቃላይ አሸናፊ የጨዋታዎችን የደረጃ ነጥብ ይደምራል፦',
      placementRanks: ['1ኛ', '2ኛ', '3ኛ', '4ኛ', '5ኛ'],
      sixthPlusZero: '6ኛ+፦ 0 ነጥብ',
      recentApprovedWinners: 'የቅርብ ጊዜ የጸደቁ አሸናፊዎች',
      winnerVerificationInProgress: 'የአሸናፊዎች ማረጋገጫ በሂደት ላይ ነው።',
      overallChampion: 'አጠቃላይ ሻምፒዮን',
      gameWinner: 'የጨዋታ አሸናፊ',
      prizeLabel: 'ሽልማት፦',
      prizeStatuses: {
        unclaimed: 'ያልተወሰደ',
        contacted: 'ተገናኝተዋል',
        awarded: 'ተሰጥቷል',
        forfeited: 'ተሰርዟል',
      },
    },
    shell: {
      backToGamesShort: 'ጨዋታዎች',
      backToGamesAria: 'ወደ አርኬድ ጨዋታዎች ተመለስ',
      unmuteAria: 'ድምጽ ክፈት',
      muteAria: 'ድምጽ ዝጋ',
      resume: 'ቀጥል',
      pause: 'አቁም',
      restart: 'እንደገና',
      resumeAria: 'ጨዋታውን ቀጥል',
      pauseAria: 'ጨዋታውን አቁም',
      restartAria: 'ጨዋታውን እንደገና ጀምር',
    },
    common: {
      scoreHud: 'ነጥብ',
      bestHud: 'ምርጥ',
      levelHud: 'ደረጃ',
      livesHud: 'ሕይወት',
      chancesHud: 'ዕድል',
      startGame: 'ጨዋታ ጀምር',
      gamePaused: 'ጨዋታው ቆሟል',
      resume: 'ቀጥል',
      restart: 'እንደገና ጀምር',
      backToGames: 'ወደ ጨዋታዎች',
      playAgain: 'እንደገና ተጫወት',
      gameOver: 'ጨዋታው አልቋል',
      newPersonalBest: 'አዲስ የግል ምርጥ ነጥብ!',
      scoreLabel: 'ነጥብ፦',
      bestLabel: 'ምርጥ፦',
      pauseLegendSpaceP: 'ማቆም፦ Space / P',
      pauseLegendP: 'ማቆም፦ P',
      restartLegendR: 'እንደገና፦ R',
      backLegendEsc: 'ተመለስ፦ Esc',
      livesRemainingAria: (lives) => `የቀረ ሕይወት፦ ${lives}`,
      chancesRemainingAria: (chances) => `የቀረ ዕድል፦ ${chances}`,
    },
    poopMan: {
      title: 'ፖፕ ማን',
      ariaLabel: 'የፖፕ ማን አርኬድ ጨዋታ',
      description:
        'ሁሉንም የሽንት ቤት ወረቀቶች ይሰብስቡ፣ ለፍጥነት ወርቃማ ወረቀቶችን ይያዙ እና ጀርሞችን ያምልጡ!',
      mobileHint: 'ሞባይል፦ የአቅጣጫ ቁልፎችን ይንኩ ወይም በስክሪኑ ያንሸራትቱ',
      desktopHint: 'ኮምፒውተር፦ የቀስት ቁልፎች ወይም WASD',
      legendMove: 'እንቅስቃሴ፦ ቀስት ቁልፎች / WASD',
      moveUpAria: 'ወደ ላይ ሂድ',
      moveLeftAria: 'ወደ ግራ ሂድ',
      moveDownAria: 'ወደ ታች ሂድ',
      moveRightAria: 'ወደ ቀኝ ሂድ',
      levelClearedBonus: (level, bonus) => `ደረጃ ${level} ተጠናቋል · +${bonus} ጉርሻ`,
      victoryHeading: 'ቱቦዎቹ ጸድተዋል!',
      victoryBody: 'ፖፕ ማን ሁሉንም ወረቀት ጠርጓል። ለፈጣን ጀርሞች ዝግጁ ነዎት?',
      nextLevel: 'ቀጣይ ደረጃ',
      cloggedOutLevel: (level) => `ተደፈነ · ደረጃ ${level}`,
      niceRun: (nickname) => (nickname ? `ጥሩ ጉዞ፣ ${nickname}!` : 'ጨዋታው አልቋል'),
    },
    toiletBasketball: {
      title: 'የመጸዳጃ ቅርጫት ኳስ',
      ariaLabel: 'የመጸዳጃ ቅርጫት ኳስ አርኬድ ጨዋታ',
      mobileHint: 'ለመወርወር ኳሱን ወደኋላ ጎትተው ይልቀቁ!',
      legendAim: 'ማነጣጠር፦ ኳሱን ወደኋላ ጎትተው ይልቀቁ',
      legendSwish: 'ቀጥታ መግባት +2 ነጥብ ያስገኛል',
      streak: (n) => `${n}x ተከታታይ`,
      wind: 'ንፋስ',
      roundComplete: '3 ስህተቶች · ዙሩ ተጠናቋል',
      niceShooting: (nickname) => (nickname ? `ድንቅ ውርወራ፣ ${nickname}!` : 'ድንቅ ውርወራ!'),
      madeLabel: 'የገቡ፦',
      brickLeftCallout: (remaining) => `ሳተ! ${remaining} ቀረ`,
      gameOverCallout: 'ጨዋታው አልቋል!',
      swishCallout: (pts) => `+${pts} ቀጥታ!`,
      splashCallout: (pts) => `+${pts} ገባ!`,
    },
    poopDrop: {
      title: 'ፖፕ ድሮፕ',
      ariaLabel: 'የፖፕ ድሮፕ አርኬድ ጨዋታ',
      description:
        'የሚወድቁ ፖፖችንና ወርቃማ ወረቀቶችን በመጸዳጃ ባልዲዎ ይያዙ! መምቻ፣ ጀርም እና ከባድ መፍቻ ያምልጡ።',
      mobileHint: 'ሞባይል፦ በስክሪኑ ያንሸራትቱ ወይም ግራ / ቀኝ ቁልፎችን ይጠቀሙ',
      desktopHint: 'ኮምፒውተር፦ ግራ / ቀኝ ቀስቶች ወይም A / D',
      legendMove: 'እንቅስቃሴ፦ ግራ / ቀኝ ቀስት ወይም A / D (ወይም ጎትት)',
      streak: (combo, mult) =>
        mult > 1 ? `${combo} ተከታታይ (${mult}x)` : `${combo} ተከታታይ`,
      leftBtn: 'ግራ',
      rightBtn: 'ቀኝ',
      moveLeftAria: 'ባልዲውን ወደ ግራ ውሰድ',
      moveRightAria: 'ባልዲውን ወደ ቀኝ ውሰድ',
      bucketFull: 'ባልዲው ሞላ!',
      niceCatching: (nickname) => (nickname ? `ጥሩ መያዝ፣ ${nickname}!` : 'ጨዋታው አልቋል'),
      caughtLabel: 'የተያዙ፦',
      oopsCallout: 'ውይ! -1 ♥',
      splatCallout: 'ተበላሸ! -1 ♥',
      goldCallout: (pts) => `+${pts} ወርቅ!`,
    },
    poopRun: {
      title: 'ፖፕ ሩጫ',
      ariaLabel: 'የፖፕ ሩጫ አርኬድ ጨዋታ',
      description:
        'በመታጠቢያ ቤቱ ውስጥ ይሩጡ! መወጠሪያዎችን ይዝለሉ፣ ከላይ ቱቦዎች ስር ይሽሎክሎኩ፣ ወረቀቶችንም ይሰብስቡ።',
      mobileHint: 'ሞባይል፦ ዝለል / ተንሸራተት ቁልፎችን ይንኩ ወይም ወደ ላይ / ታች ያንሸራትቱ',
      desktopHint: 'ኮምፒውተር፦ Up / W / Space ለመዝለል · Down / S ለመንሸራተት',
      legendJump: 'ዝለል፦ Space / Up / W',
      legendSlide: 'ተንሸራተት፦ Down / S',
      distHud: 'ርቀት',
      rollsHud: 'ወረቀት',
      speedSuffix: 'ፍጥነት',
      slideBtn: 'ተንሸራተት',
      jumpBtn: 'ዝለል',
      startRun: 'ሩጫ ጀምር',
      runPaused: 'ሩጫው ቆሟል',
      sprintComplete: (meters) => `${meters}ሜ ሩጫ ተጠናቋል`,
      greatSprint: (nickname) => (nickname ? `ድንቅ ሩጫ፣ ${nickname}!` : 'ድንቅ ሩጫ!'),
      wipedOut: 'ወደቁ!',
      rollsLabel: 'ወረቀት፦',
      duckCallout: 'ጎንበስ!',
      shieldCallout: (pts) => `+${pts} መከላከያ!`,
      shieldSavedCallout: 'መከላከያ አዳነ!',
    },
    dontDrop: {
      title: 'ፖፑን አትጣል',
      ariaLabel: 'ፖፑን አትጣል አርኬድ ጨዋታ',
      description:
        'ፖፑን በአየር ላይ ያንሳፍፉ! በመታጠቢያ ቱቦ በሮች መካከል ይብረሩ፣ ወርቃማ ወረቀት ይያዙ፣ መሬትና ጀርም አይንኩ።',
      mobileHint: 'ሞባይል፦ ስክሪኑን ይንኩ ወይም አንሳፍፍ ቁልፍን ይጫኑ',
      desktopHint: 'ኮምፒውተር፦ Click / Space / Up ቀስት / W',
      legendBounce: 'አንሳፍፍ፦ Click / Space / Up / W',
      gatesHud: 'በሮች',
      tapToBounce: 'ለማንሳፈፍ ይንኩ',
      startBouncing: 'ማንሳፈፍ ጀምር',
      gatesClearedLabel: (gates) => `${gates} በሮች ታልፈዋል`,
      niceFlying: (nickname) => (nickname ? `ድንቅ በረራ፣ ${nickname}!` : 'ድንቅ በረራ!'),
      dropped: 'ወደቀ!',
      gatesLabel: 'በሮች፦',
      gatesMilestoneCallout: (gates) => `${gates} በሮች!`,
      goldBonusCallout: '+5 ወርቅ!',
    },
  },

  ENG: {
    launcherButton: 'PLAY POOP MAN',
    launcherAriaLabel: 'Play POOP MAN mini-game',
    languageLabel: 'Language',
    scoreNotices: {
      registerToSave: 'Register a player profile to save scores to the leaderboard.',
      savingScore: 'Saving score to leaderboard...',
      savedLocallyIncomplete: 'Saved locally (incomplete server response).',
      savedForVerification: 'Score saved for verification.',
      savedNewPersonalBest: 'New personal best saved to the competition leaderboard!',
      savedToLeaderboard: 'Score saved to competition leaderboard.',
      syncSkippedPrefix: 'Leaderboard sync skipped:',
      savedLocallyOffline: 'Saved locally (leaderboard unavailable).',
    },
    games: {
      'poop-man': {
        name: 'Poop Man',
        shortDescription:
          'Maze arcade classic. Collect every toilet-paper roll, grab golden rolls for speed boosts, and dodge the germs!',
      },
      'toilet-basketball': {
        name: 'Toilet Basketball',
        shortDescription:
          'Drag back, aim the arc, and sink poop shots into the porcelain hoop before 3 misses end your streak!',
      },
      'poop-drop': {
        name: 'Poop Drop',
        shortDescription:
          'Slide your toilet bucket to catch falling poops and bonus rolls while dodging plungers and germs!',
      },
      'poop-run': {
        name: 'Poop Run',
        shortDescription:
          'Endless bathroom sprint — jump over plungers, slide under overhead pipes, and grab toilet paper rolls!',
      },
      'dont-drop-the-poop': {
        name: "Don't Drop the Poop",
        shortDescription:
          'Tap to keep the bouncing poop airborne through bathroom pipe gates and floating germs!',
      },
    },
    hub: {
      arcadeTitleSuffix: 'Arcade',
      backToSiteShort: 'Site',
      backToSiteAria: 'Return to Zblal website',
      openProfileAria: 'Open player profile',
      tabs: {
        games: 'Games',
        leaderboards: 'Leaderboards',
        ranksShort: 'Ranks',
        profile: 'Profile',
      },
      welcomeBack: (nickname) => `Welcome back, ${nickname}!`,
      profileReady: (nickname) => `Player profile ready: ${nickname}`,
      sessionExpiredNotice:
        'Previous player session expired. Enter your phone number to restore or register.',
      dismiss: 'Dismiss',
      syncOffline: (error) =>
        `Leaderboard sync offline (${error}). You can still play all games locally.`,
      retry: 'Retry',
      gamesPlayedFraction: (played, total) => `${played}/${total} games played`,
      switchPlayer: 'Switch Player',
      switchShort: 'Switch',
      yourBestScores: 'Your Best Scores',
      bestPrefix: 'Best:',
      play: 'Play',
      ranks: 'Ranks',
      comingSoon: 'Coming Soon',
      soon: 'Soon',
      dailyDefault: 'Daily',
      weeklyDefault: 'Weekly',
      loading: 'Loading...',
      live: 'Live',
      ended: 'Ended',
      tapDailyRanks: 'Tap for daily ranks',
      tapWeeklyPrizes: 'Tap for weekly prizes',
      viewLeaderboardAria: (gameName) => `View ${gameName} leaderboard`,
    },
    registration: {
      cardKicker: 'POPO Arcade Player Card',
      returningTitle: 'Returning Player',
      newPlayerTitle: 'New Player Sign-Up',
      entryModeAria: 'Player entry mode',
      tabNewPlayer: 'New Player',
      tabReturningPlayer: 'Returning Player',
      returningSubtitle:
        'Enter only your Ethiopian mobile number to restore your nickname, player ID, and saved high scores immediately.',
      newPlayerSubtitle:
        'Pick a nickname and Ethiopian mobile number once. Your permanent player ID tracks all scores across all 5 games.',
      nicknameLabel: 'Player Nickname',
      nicknamePlaceholder: 'e.g. PipeKing99',
      phoneLabel: 'Ethiopian Mobile Number',
      phonePlaceholder: '0911 223 344 or +251 911 223 344',
      phoneHelp:
        'Normalized to +251. Public boards only show a masked number (+251 9•• ••• 123).',
      errInvalidPhone:
        'Enter a valid Ethiopian mobile number (e.g. 0911223344 or +251911223344).',
      errInvalidNickname: 'Enter a nickname between 2 and 24 characters.',
      errSaveProfile: 'Unable to save player profile. Please try again.',
      errFindProfile: 'Unable to find player profile. Please try again.',
      errInvalidServerProfile:
        'Server returned an invalid player profile. Please try again.',
      errNotFoundForPhone:
        'No arcade profile found for this phone number. Switch to New Player to register.',
      errSuspendedProfile:
        'This player profile has been suspended. Please contact support.',
      createFromLoginCta: 'Create New Profile with This Number',
      backToSite: 'Back to Site',
      restoring: 'Restoring Profile...',
      saving: 'Saving Profile...',
      restoreAndPlay: 'Restore & Play',
      createAndPlay: 'Create Profile & Play',
      noOtpTitle: 'No OTP required · Free to play & win',
      noOtpDetail1:
        'No SMS, OTP, or password is required. Returning players simply enter their Ethiopian mobile number to restore their player ID, nickname, and scores.',
      noOtpDetail2:
        'Free entry · No purchase required · Scores are checked before prize confirmation, and players under 18 require parent/guardian consent to claim prizes.',
    },
    leaderboard: {
      overallTab: 'Overall',
      periodDaily: 'Daily',
      periodWeekly: 'Weekly',
      periodAllTime: 'All-Time',
      dailyChallenge: 'Daily Challenge',
      weeklyChallenge: 'Weekly Challenge',
      dailyPrizeFallback:
        'Daily top overall champion & per-game leaders verified by Zblal.',
      weeklyPrizeFallback:
        'Weekly champion & game winners reviewed after the competition closes.',
      endsPrefix: 'Ends',
      midnightEat: 'Midnight EAT',
      sundayMidnightEat: 'Sunday Midnight EAT',
      refreshAria: 'Refresh leaderboard',
      yourRank: 'Your Rank:',
      loadingOverall: 'Loading Overall Champion standings...',
      loadingGame: 'Loading game standings...',
      tryAgain: 'Try Again',
      noScoresTitle: 'No Valid Scores Yet',
      noScoresSubtitle: (periodLabel) =>
        `Be the first player on the ${periodLabel} board! Play any POPO Arcade game to claim #1.`,
      rank1Label: '1st',
      rank2Label: '2nd',
      rank3Label: '3rd',
      youBadge: 'YOU',
      youParen: '(You)',
      pointsLabel: 'Points',
      bestLabel: 'Best',
      bestScoreLabel: 'Best Score',
      ptsUnit: 'pts',
      tableRank: 'Rank',
      tablePlayer: 'Player',
      tablePhone: 'Phone',
      tableTotalPoints: 'Total Points',
      tableBestScore: 'Best Score',
      howRankingsWork: 'How Rankings & Overall Points Work',
      rankingsExplanationPrefix: 'Each game ranks players by their ',
      rankingsExplanationStrong: 'highest valid single run',
      rankingsExplanationSuffix:
        ' (earlier score wins ties). Overall Champion sums placement points across games:',
      placementRanks: ['1st', '2nd', '3rd', '4th', '5th'],
      sixthPlusZero: '6th+: 0 pts',
      recentApprovedWinners: 'Recent Approved Winners',
      winnerVerificationInProgress: 'Winner verification in progress.',
      overallChampion: 'Overall Champion',
      gameWinner: 'Game Winner',
      prizeLabel: 'Prize:',
      prizeStatuses: {
        unclaimed: 'unclaimed',
        contacted: 'contacted',
        awarded: 'awarded',
        forfeited: 'forfeited',
      },
    },
    shell: {
      backToGamesShort: 'Games',
      backToGamesAria: 'Back to arcade games',
      unmuteAria: 'Unmute sound',
      muteAria: 'Mute sound',
      resume: 'Resume',
      pause: 'Pause',
      restart: 'Restart',
      resumeAria: 'Resume game',
      pauseAria: 'Pause game',
      restartAria: 'Restart game',
    },
    common: {
      scoreHud: 'SCORE',
      bestHud: 'BEST',
      levelHud: 'LVL',
      livesHud: 'LIVES',
      chancesHud: 'CHANCES',
      startGame: 'Start Game',
      gamePaused: 'Game Paused',
      resume: 'Resume',
      restart: 'Restart',
      backToGames: 'Back to Games',
      playAgain: 'Play Again',
      gameOver: 'Game Over',
      newPersonalBest: 'NEW PERSONAL BEST!',
      scoreLabel: 'Score:',
      bestLabel: 'Best:',
      pauseLegendSpaceP: 'Pause: Space / P',
      pauseLegendP: 'Pause: P',
      restartLegendR: 'Restart: R',
      backLegendEsc: 'Back: Esc',
      livesRemainingAria: (lives) => `Lives remaining: ${lives}`,
      chancesRemainingAria: (chances) => `Shots remaining: ${chances}`,
    },
    poopMan: {
      title: 'POOP MAN',
      ariaLabel: 'POOP MAN Arcade Game',
      description:
        'Collect every toilet-paper roll, grab golden rolls for speed boosts, and dodge the germs!',
      mobileHint: 'Mobile: D-pad or swipe anywhere',
      desktopHint: 'Desktop: Arrow Keys or WASD',
      legendMove: 'Move: Arrow Keys / WASD',
      moveUpAria: 'Move Up',
      moveLeftAria: 'Move Left',
      moveDownAria: 'Move Down',
      moveRightAria: 'Move Right',
      levelClearedBonus: (level, bonus) => `LEVEL ${level} CLEARED · +${bonus} BONUS`,
      victoryHeading: 'Spotless Pipes!',
      victoryBody: 'POOP MAN swept every last roll. Ready for faster germs?',
      nextLevel: 'Next Level',
      cloggedOutLevel: (level) => `CLOGGED OUT · LEVEL ${level}`,
      niceRun: (nickname) => (nickname ? `Nice Run, ${nickname}!` : 'Game Over'),
    },
    toiletBasketball: {
      title: 'TOILET BASKETBALL',
      ariaLabel: 'Toilet Basketball Arcade Game',
      mobileHint: 'Drag back from the ball & release to shoot!',
      legendAim: 'Aim & Shoot: Drag back from ball & release',
      legendSwish: 'Clean swishes score +2 pts',
      streak: (n) => `${n}x STREAK`,
      wind: 'WIND',
      roundComplete: '3 MISSES · ROUND COMPLETE',
      niceShooting: (nickname) =>
        `Nice Shooting${nickname ? `, ${nickname}` : ''}!`,
      madeLabel: 'Made:',
      brickLeftCallout: (remaining) => `BRICK! ${remaining} LEFT`,
      gameOverCallout: 'GAME OVER!',
      swishCallout: (pts) => `+${pts} SWISH!`,
      splashCallout: (pts) => `+${pts} SPLASH!`,
    },
    poopDrop: {
      title: 'POOP DROP',
      ariaLabel: 'Poop Drop Arcade Game',
      description:
        'Catch falling poops & golden rolls in your toilet bucket! Dodge plungers, germs, and heavy wrenches.',
      mobileHint: 'Mobile: Drag on screen or use Left / Right buttons',
      desktopHint: 'Desktop: Left / Right Arrow Keys or A / D',
      legendMove: 'Move: Left / Right Arrow or A / D (or Drag)',
      streak: (combo, mult) =>
        mult > 1 ? `${combo} STREAK (${mult}x)` : `${combo} STREAK`,
      leftBtn: 'LEFT',
      rightBtn: 'RIGHT',
      moveLeftAria: 'Move Bucket Left',
      moveRightAria: 'Move Bucket Right',
      bucketFull: 'BUCKET FULL!',
      niceCatching: (nickname) =>
        `Nice Catching${nickname ? `, ${nickname}` : ''}!`,
      caughtLabel: 'Caught:',
      oopsCallout: 'OOPS! -1 ♥',
      splatCallout: 'SPLAT! -1 ♥',
      goldCallout: (pts) => `+${pts} GOLD!`,
    },
    poopRun: {
      title: 'POOP RUN',
      ariaLabel: 'Poop Run Endless Runner Game',
      description:
        'Sprint through the bathroom! Jump over plungers, duck under overhead pipes, and collect toilet paper rolls.',
      mobileHint: 'Mobile: Tap JUMP / SLIDE buttons or swipe Up / Down',
      desktopHint: 'Desktop: Up / W / Space to Jump · Down / S to Slide',
      legendJump: 'Jump: Space / Up / W',
      legendSlide: 'Slide / Fast Drop: Down / S',
      distHud: 'DIST',
      rollsHud: 'ROLLS',
      speedSuffix: 'SPD',
      slideBtn: 'SLIDE',
      jumpBtn: 'JUMP',
      startRun: 'Start Run',
      runPaused: 'Run Paused',
      sprintComplete: (meters) => `${meters}m SPRINT COMPLETE`,
      greatSprint: (nickname) => `Great Sprint${nickname ? `, ${nickname}` : ''}!`,
      wipedOut: 'Wiped Out!',
      rollsLabel: 'Rolls:',
      duckCallout: 'DUCK!',
      shieldCallout: (pts) => `+${pts} SHIELD!`,
      shieldSavedCallout: 'SHIELD SAVED!',
    },
    dontDrop: {
      title: "DON'T DROP THE POOP",
      ariaLabel: "Don't Drop the Poop Arcade Game",
      description:
        'Keep the poop bouncing in the air! Fly through bathroom pipe gates, grab golden rolls, and avoid hitting the floor, ceiling, or germs.',
      mobileHint: 'Mobile: Tap anywhere or hit BOUNCE',
      desktopHint: 'Desktop: Click / Space / Up Arrow / W',
      legendBounce: 'Bounce: Click / Space / Up / W',
      gatesHud: 'GATES',
      tapToBounce: 'TAP TO BOUNCE',
      startBouncing: 'Start Bouncing',
      gatesClearedLabel: (gates) => `${gates} GATES CLEARED`,
      niceFlying: (nickname) => `Nice Flying${nickname ? `, ${nickname}` : ''}!`,
      dropped: 'Dropped!',
      gatesLabel: 'Gates:',
      gatesMilestoneCallout: (gates) => `${gates} GATES!`,
      goldBonusCallout: '+5 GOLD!',
    },
  },

  ORO: {
    launcherButton: 'POOP MAN TAPHADHU',
    launcherAriaLabel: 'Tapha Poop Man bani',
    languageLabel: 'Afaan',
    scoreNotices: {
      registerToSave: 'Qabxii kee gabatee irratti olkaa’uuf eenyummaa uumi.',
      savingScore: 'Qabxiin gara gabateetti ergamaa jira...',
      savedLocallyIncomplete: 'Meenshaarratti olkaa’ameera (deebii guutuu miti).',
      savedForVerification: 'Qabxiin mirkaneeffannaaf olkaa’ameera.',
      savedNewPersonalBest: 'Qabxiin fooyya’aan haaraan gabatee irratti galmaa’eera!',
      savedToLeaderboard: 'Qabxiin gabatee dorgommii irratti galmaa’eera.',
      syncSkippedPrefix: 'Wal-simsiisni gabatee irra darbeera:',
      savedLocallyOffline: 'Meenshaarratti olkaa’ameera (gabateen hin jiru).',
    },
    games: {
      'poop-man': {
        name: 'Poop Man',
        shortDescription:
          'Tapha maraamaa! Waraqaa mana fincaanii hunda sassaabi, saffisaaf waraqaa warqee fudhadhu, jarmii irraa fagaadhu!',
      },
      'toilet-basketball': {
        name: 'Baaskeetboolii Mana Fincaanii',
        shortDescription:
          'Duubatti harkisi, xiyyeeffadhu, osoo si’a 3 hin dogoggoriin poop gara qoodaatti darbadhu!',
      },
      'poop-drop': {
        name: 'Poop Drop',
        shortDescription:
          'Baaldii kee sochoosuun poop fi waraqaa warqee bu’an qabi; jarmii fi meeshaa ulfaataa irraa fagaadhu!',
      },
      'poop-run': {
        name: 'Fiigicha Poop',
        shortDescription:
          'Fiigicha mana fincaanii — gufuu irra utaali, ujummoo jalaan darbi, waraqaa sassaabi!',
      },
      'dont-drop-the-poop': {
        name: 'Poop Hin Kuffisin',
        shortDescription:
          'Tuquun poop qilleensa keessa tursiisi, balbala ujummoo keessa darbi!',
      },
    },
    hub: {
      arcadeTitleSuffix: 'Arcade',
      backToSiteShort: 'Fuula',
      backToSiteAria: 'Gara fuula Zblal deebi’i',
      openProfileAria: 'Eenyummaa taphataa bani',
      tabs: {
        games: 'Taphoota',
        leaderboards: 'Gabatee Sadarkaa',
        ranksShort: 'Sadarkaa',
        profile: 'Eenyummaa',
      },
      welcomeBack: (nickname) => `Baga nagaan deebite, ${nickname}!`,
      profileReady: (nickname) => `Eenyummaan taphataa qophaa’eera: ${nickname}`,
      sessionExpiredNotice:
        'Turtii duraanii dhumateera. Deebisuu ykn galmaa’uuf lakkoofsa bilbilaa galchi.',
      dismiss: 'Cufi',
      syncOffline: (error) =>
        `Gabateen wal hin qunnamne (${error}). Taphoota hunda taphachuu dandeessa.`,
      retry: 'Irra deebi’i',
      gamesPlayedFraction: (played, total) => `${played}/${total} taphoota taphatamaniiru`,
      switchPlayer: 'Taphataa Jijjiiri',
      switchShort: 'Jijjiiri',
      yourBestScores: 'Qabxiiwwan Kee Olaanoo',
      bestPrefix: 'Olaanaa:',
      play: 'Taphadhu',
      ranks: 'Sadarkaa',
      comingSoon: 'Dhiyootti',
      soon: 'Dhiyootti',
      dailyDefault: 'Guyyaa',
      weeklyDefault: 'Torbanii',
      loading: 'Fe’aa jira...',
      live: 'Kallattii',
      ended: 'Xumurame',
      tapDailyRanks: 'Sadarkaa guyyaa ilaali',
      tapWeeklyPrizes: 'Badhaasa torbanii ilaali',
      viewLeaderboardAria: (gameName) => `Gabatee sadarkaa ${gameName} ilaali`,
    },
    registration: {
      cardKicker: 'Kaardii Taphataa Zblal Arcade',
      returningTitle: 'Taphataa Duraanii',
      newPlayerTitle: 'Galmee Taphataa Haaraa',
      entryModeAria: 'Haala seensaa taphataa',
      tabNewPlayer: 'Taphataa Haaraa',
      tabReturningPlayer: 'Taphataa Duraanii',
      returningSubtitle:
        'Maqaa masoo, ID fi qabxii olaanaa kee battalumatti deebisuuf lakkoofsa bilbilaa Itoophiyaa qofa galchi.',
      newPlayerSubtitle:
        'Maqaa masoo fi lakkoofsa bilbilaa Itoophiyaa yeroo tokko filadhu. IDn dhaabbataa kee taphoota 5n irratti qabxii kee eega.',
      nicknameLabel: 'Maqaa Masoo Taphataa',
      nicknamePlaceholder: 'fkn. PipeKing99',
      phoneLabel: 'Lakkoofsa Bilbilaa Itoophiyaa',
      phonePlaceholder: '0911 223 344 ykn +251 911 223 344',
      phoneHelp:
        'Gara +251tti jijjiirama. Gabatee hawaasaa irratti lakkoofsi haguugame qofti mul’ata (+251 9•• ••• 123).',
      errInvalidPhone:
        'Lakkoofsa bilbilaa Itoophiyaa sirrii galchi (fkn. 0911223344 ykn +251911223344).',
      errInvalidNickname: 'Maqaa masoo qubee 2 hanga 24 qabu galchi.',
      errSaveProfile: 'Eenyummaa olkaa’uun hin danda’amne. Irra deebi’i yaali.',
      errFindProfile: 'Eenyummaan hin argamne. Irra deebi’i yaali.',
      errInvalidServerProfile: 'Deebii sirrii hin taane. Irra deebi’i yaali.',
      errNotFoundForPhone:
        'Lakkoofsa bilbilaa kanaan eenyummaan hin argamne. Galmaa’uuf gara Taphataa Haaraatti jijjiiri.',
      errSuspendedProfile: 'Eenyummaan kun dhorkameera. Deeggarsa qunnami.',
      createFromLoginCta: 'Lakkoofsa Kanaan Eenyummaa Haaraa Uumi',
      backToSite: 'Gara Fuulaatti',
      restoring: 'Deebisaa jira...',
      saving: 'Olkaa’aa jira...',
      restoreAndPlay: 'Deebisii Taphadhu',
      createAndPlay: 'Uumii Taphadhu',
      noOtpTitle: 'OTP hin barbaachisu · Tophadhuutii badhaafami',
      noOtpDetail1:
        'SMS, OTP ykn jechi iccitii hin barbaachisu. Taphattoonni duraanii lakkoofsa bilbilaa qofaan deebi’u.',
      noOtpDetail2:
        'Bilisaa · Bittaa hin gaafatu · Qabxiin badhaasa dura ni mirkanaa’a; waggaa 18 gadiif eeyyama maatii barbaachisa.',
    },
    leaderboard: {
      overallTab: 'Waliigala',
      periodDaily: 'Guyyaa',
      periodWeekly: 'Torban',
      periodAllTime: 'Yeroo Hunda',
      dailyChallenge: 'Dorgommii Guyyaa',
      weeklyChallenge: 'Dorgommii Torbanii',
      dailyPrizeFallback:
        'Injifattoonni guyyaa Zblal’n mirkaneeffaman.',
      weeklyPrizeFallback:
        'Injifattoonni torbanii erga dorgommiin xumuramee ilaalama.',
      endsPrefix: 'Xumurama:',
      midnightEat: 'Halkan Walakkaa EAT',
      sundayMidnightEat: 'Dilbata Halkan Walakkaa EAT',
      refreshAria: 'Gabatee haaromsi',
      yourRank: 'Sadarkaa Kee:',
      loadingOverall: 'Sadarkaa waliigalaa fe’aa jira...',
      loadingGame: 'Sadarkaa taphaa fe’aa jira...',
      tryAgain: 'Irra Deebi’i',
      noScoresTitle: 'Qabxiin Sirrii Hin Jiru',
      noScoresSubtitle: (periodLabel) =>
        `Gabatee ${periodLabel} irratti taphataa jalqabaa ta’i! #1 argachuuf taphadhu.`,
      rank1Label: '1ffaa',
      rank2Label: '2ffaa',
      rank3Label: '3ffaa',
      youBadge: 'SI’I',
      youParen: '(Si’i)',
      pointsLabel: 'Qabxii',
      bestLabel: 'Olaanaa',
      bestScoreLabel: 'Qabxii Olaanaa',
      ptsUnit: 'qb',
      tableRank: 'Sadarkaa',
      tablePlayer: 'Taphataa',
      tablePhone: 'Bilbila',
      tableTotalPoints: 'Qabxii Waliigalaa',
      tableBestScore: 'Qabxii Olaanaa',
      howRankingsWork: 'Sadarkaa fi Qabxiin Akkamitti Hojjeta',
      rankingsExplanationPrefix: 'Taphni hundi ',
      rankingsExplanationStrong: 'qabxii olaanaa tapha tokkoo',
      rankingsExplanationSuffix:
        ' irratti hirkata. Injifataan waliigalaa qabxii sadarkaa ida’a:',
      placementRanks: ['1ffaa', '2ffaa', '3ffaa', '4ffaa', '5ffaa'],
      sixthPlusZero: '6ffaa+: 0 qb',
      recentApprovedWinners: 'Injifattoota Dhihoo Mirkanaa’an',
      winnerVerificationInProgress: 'Mirkaneessi injifattootaa adeemsa irra jira.',
      overallChampion: 'Shaampiyoona Waliigalaa',
      gameWinner: 'Injifataa Taphaa',
      prizeLabel: 'Badhaasa:',
      prizeStatuses: {
        unclaimed: 'hin fudhatamne',
        contacted: 'qunnamameera',
        awarded: 'kennameera',
        forfeited: 'hafeera',
      },
    },
    shell: {
      backToGamesShort: 'Taphoota',
      backToGamesAria: 'Gara taphootaatti deebi’i',
      unmuteAria: 'Sagalee bani',
      muteAria: 'Sagalee cufi',
      resume: 'Itti Fufi',
      pause: 'Dhaabi',
      restart: 'Irra Deebi’i',
      resumeAria: 'Tapha itti fufi',
      pauseAria: 'Tapha dhaabi',
      restartAria: 'Tapha irra deebi’i',
    },
    common: {
      scoreHud: 'QABXII',
      bestHud: 'OLAANAA',
      levelHud: 'SAD',
      livesHud: 'LUBBUU',
      chancesHud: 'CARRAA',
      startGame: 'Tapha Jalqabi',
      gamePaused: 'Taphni Dhaabbateera',
      resume: 'Itti Fufi',
      restart: 'Irra Deebi’i',
      backToGames: 'Gara Taphootaatti',
      playAgain: 'Ammaas Taphadhu',
      gameOver: 'Taphni Xumurame',
      newPersonalBest: 'QABXII OLAANAA HAARAA!',
      scoreLabel: 'Qabxii:',
      bestLabel: 'Olaanaa:',
      pauseLegendSpaceP: 'Dhaabi: Space / P',
      pauseLegendP: 'Dhaabi: P',
      restartLegendR: 'Irra Deebi’i: R',
      backLegendEsc: 'Deebi’i: Esc',
      livesRemainingAria: (lives) => `Lubbuu hafe: ${lives}`,
      chancesRemainingAria: (chances) => `Carraa hafe: ${chances}`,
    },
    poopMan: {
      title: 'POOP MAN',
      ariaLabel: 'Tapha Poop Man',
      description:
        'Waraqaa mana fincaanii hunda sassaabi, saffisaaf waraqaa warqee fudhadhu, jarmii irraa fagaadhu!',
      mobileHint: 'Moobaayilii: D-pad ykn haxaa’i',
      desktopHint: 'Deeskitooppii: Xiyyoota ykn WASD',
      legendMove: 'Sochii: Xiyyoota / WASD',
      moveUpAria: 'Ol deemi',
      moveLeftAria: 'Bitaa deemi',
      moveDownAria: 'Gadi deemi',
      moveRightAria: 'Mirga deemi',
      levelClearedBonus: (level, bonus) => `SADARKAA ${level} XUMURAME · +${bonus} BONASII`,
      victoryHeading: 'Ujummoon Qulqullaa’e!',
      victoryBody: 'Poop Man waraqaa hunda fixeera. Jarmii saffisaaf qophooftee?',
      nextLevel: 'Sadarkaa Itti Aanu',
      cloggedOutLevel: (level) => `CUFAMEERA · SADARKAA ${level}`,
      niceRun: (nickname) => (nickname ? `Tapha Gaarii, ${nickname}!` : 'Taphni Xumurame'),
    },
    toiletBasketball: {
      title: 'BAASKETBOOLII MANA FINCAANII',
      ariaLabel: 'Tapha Baaskeetboolii Mana Fincaanii',
      mobileHint: 'Darbachuuf kubbaa duubatti harkisii gadi lakkisi!',
      legendAim: 'Xiyyeeffadhu: Kubbaa duubatti harkisi',
      legendSwish: 'Kallattiin galchuun +2 kenna',
      streak: (n) => `${n}x WALITTI AANSA`,
      wind: 'QILLEENSA',
      roundComplete: 'DOGOGGORA 3 · MARSAAN XUMURAME',
      niceShooting: (nickname) =>
        `Darbannaa Gaarii${nickname ? `, ${nickname}` : ''}!`,
      madeLabel: 'Gale:',
      brickLeftCallout: (remaining) => `BADE! ${remaining} HAFE`,
      gameOverCallout: 'XUMURAME!',
      swishCallout: (pts) => `+${pts} KALLATTII!`,
      splashCallout: (pts) => `+${pts} GALE!`,
    },
    poopDrop: {
      title: 'POOP DROP',
      ariaLabel: 'Tapha Poop Drop',
      description:
        'Baaldii keetiin poop fi waraqaa warqee bu’an qabi! Jarmii fi meeshaa ulfaataa irraa fagaadhu.',
      mobileHint: 'Moobaayilii: Haxaa’i ykn Bitaa / Mirga tuqi',
      desktopHint: 'Deeskitooppii: Xiyya Bitaa / Mirga ykn A / D',
      legendMove: 'Sochii: Bitaa / Mirga ykn A / D (ykn Harkisi)',
      streak: (combo, mult) =>
        mult > 1 ? `${combo} WALITTI AANSA (${mult}x)` : `${combo} WALITTI AANSA`,
      leftBtn: 'BITAA',
      rightBtn: 'MIRGA',
      moveLeftAria: 'Baaldii gara bitaatti sochoosi',
      moveRightAria: 'Baaldii gara mirgaatti sochoosi',
      bucketFull: 'BAALDIIN GUUTE!',
      niceCatching: (nickname) =>
        `Qabannaa Gaarii${nickname ? `, ${nickname}` : ''}!`,
      caughtLabel: 'Qabame:',
      oopsCallout: 'OO! -1 ♥',
      splatCallout: 'BADE! -1 ♥',
      goldCallout: (pts) => `+${pts} WARQEE!`,
    },
    poopRun: {
      title: 'FIIGICHA POOP',
      ariaLabel: 'Tapha Fiigicha Poop',
      description:
        'Mana fincaanii keessa fiigi! Gufuu irra utaali, ujummoo jalaan darbi, waraqaa sassaabi.',
      mobileHint: 'Moobaayilii: UTAALI / MUCUCAADHU tuqi ykn Ol / Gadi haxaa’i',
      desktopHint: 'Deeskitooppii: Up / W / Space Utaaluuf · Down / S Mucucaachuuf',
      legendJump: 'Utaali: Space / Up / W',
      legendSlide: 'Mucucaadhu: Down / S',
      distHud: 'FAGEENYA',
      rollsHud: 'WARAQAA',
      speedSuffix: 'SAFF',
      slideBtn: 'MUCUCAADHU',
      jumpBtn: 'UTAALI',
      startRun: 'Fiigicha Jalqabi',
      runPaused: 'Fiigichi Dhaabbateera',
      sprintComplete: (meters) => `FIIGICHI ${meters}m XUMURAME`,
      greatSprint: (nickname) =>
        `Fiigicha Gaarii${nickname ? `, ${nickname}` : ''}!`,
      wipedOut: 'Kufate!',
      rollsLabel: 'Waraqaa:',
      duckCallout: 'GADI JEDHI!',
      shieldCallout: (pts) => `+${pts} GAACHANA!`,
      shieldSavedCallout: 'GAACHANNI BARAARE!',
    },
    dontDrop: {
      title: 'POOP HIN KUFFISIN',
      ariaLabel: 'Tapha Poop Hin Kuffisin',
      description:
        'Poop qilleensa keessa tursiisi! Karra ujummoo keessa barrisi, waraqaa warqee qabi.',
      mobileHint: 'Moobaayilii: Bakka kamiyyuu tuqi',
      desktopHint: 'Deeskitooppii: Click / Space / Up / W',
      legendBounce: 'Utaalchisi: Click / Space / Up / W',
      gatesHud: 'KARRA',
      tapToBounce: 'UTALCHISUUF TUQI',
      startBouncing: 'Jalqabi',
      gatesClearedLabel: (gates) => `KARRI ${gates} DARBAME`,
      niceFlying: (nickname) =>
        `Barriinsa Gaarii${nickname ? `, ${nickname}` : ''}!`,
      dropped: 'Kufe!',
      gatesLabel: 'Karra:',
      gatesMilestoneCallout: (gates) => `KARRA ${gates}!`,
      goldBonusCallout: '+5 WARQEE!',
    },
  },

  TIG: {
    launcherButton: 'ፖፕ ማን ተጻወት',
    launcherAriaLabel: 'ጸወታ ፖፕ ማን ክፈት',
    languageLabel: 'ቋንቋ',
    scoreNotices: {
      registerToSave: 'ነጥብኹም ኣብ ሰሌዳ ንምዕቃብ ፕሮፋይል ፍጠሩ።',
      savingScore: 'ነጥቢ ናብ ሰሌዳ ይልኣኽ ኣሎ...',
      savedLocallyIncomplete: 'ኣብዚ መሳርሒ ተዓቂቡ (ዘይምሉእ ምላሽ ሰርቨር)።',
      savedForVerification: 'ነጥብኹም ንምርግጋጽ ተዓቂቡ ኣሎ።',
      savedNewPersonalBest: 'ሓድሽ ብሉጽ ውልቃዊ ነጥቢ ኣብ ሰሌዳ ውድድር ተመዝጊቡ!',
      savedToLeaderboard: 'ነጥብኹም ኣብ ሰሌዳ ውድድር ተመዝጊቡ።',
      syncSkippedPrefix: 'ምምዝጋብ ሰሌዳ ተሰጊሩ፦',
      savedLocallyOffline: 'ኣብዚ መሳርሒ ተዓቂቡ (ሰሌዳ የለን)።',
    },
    games: {
      'poop-man': {
        name: 'ፖፕ ማን',
        shortDescription:
          'ክላሲክ ጸወታ መስመር! ኩሉ ወረቐት ሽቓቕ ኣክቡ፣ ንቅልጣፈ ወርቃዊ ወረቐት ሓዙ፣ ካብ ጀርም ድማ ኣምልጡ!',
      },
      'toilet-basketball': {
        name: 'ቅርጫት ኩዕሶ ሽቓቕ',
        shortDescription:
          'ንድሕሪት ስሒብኩም ኣነጻጽሩ፣ 3 ግዜ ከይሰሓትኩም ናብ ሽቓቕ ቅርጫት ኣእትዉ!',
      },
      'poop-drop': {
        name: 'ፖፕ ድሮፕ',
        shortDescription:
          'ባልዲ ሽቓቕኩም ብምንቅስቓስ ዝወድቁ ፖፕን ወርቃዊ ወረቐትን ሓዙ፤ ጀርም ድማ ኣምልጡ!',
      },
      'poop-run': {
        name: 'ጉያ ፖፕ',
        shortDescription:
          'ዘየቋርጽ ጉያ ሽቓቕ — መዕገቲታት ዝለሉ፣ ትሕቲ ቱቦታት ተንሸራተቱ፣ ወረቐት ኣክቡ!',
      },
      'dont-drop-the-poop': {
        name: 'ነቲ ፑፕ ኣይተውድቆ',
        shortDescription:
          'ብምትንካፍ ነቲ ፑፕ ኣብ ኣየር ኣንሳፍፍዎ እሞ ብመንጎ ቱቦታት ሽቓቕ ሕለፉ!',
      },
    },
    hub: {
      arcadeTitleSuffix: 'ኣርኬድ',
      backToSiteShort: 'መበገሲ',
      backToSiteAria: 'ናብ ድረ-ገጽ Zblal ተመለስ',
      openProfileAria: 'ፕሮፋይል ተጻዋቲ ክፈት',
      tabs: {
        games: 'ጸወታታት',
        leaderboards: 'ሰሌዳ ደረጃ',
        ranksShort: 'ደረጃታት',
        profile: 'ፕሮፋይል',
      },
      welcomeBack: (nickname) => `እንቋዕ ብደሓን ተመለስኩም፣ ${nickname}!`,
      profileReady: (nickname) => `ፕሮፋይል ተጻዋቲ ድሉው እዩ፦ ${nickname}`,
      sessionExpiredNotice:
        'ናይ ቀደም ግዜ ኣብቂዑ። ንምምላስ ወይ ንምምዝጋብ ቁጽሪ ስልክኹም የእትዉ።',
      dismiss: 'ዕጸው',
      syncOffline: (error) =>
        `ምስ ሰሌዳ ምርኻብ ኣይተኻእለን (${error})። ኩሎም ጸወታታት ክትጻወቱ ትኽእሉ ኢኹም።`,
      retry: 'ደጊምካ ፈትን',
      gamesPlayedFraction: (played, total) => `${played}/${total} ጸወታታት ተጻዊትኩም`,
      switchPlayer: 'ተጻዋቲ ቀይር',
      switchShort: 'ቀይር',
      yourBestScores: 'ብሉጻት ነጥብታትኩም',
      bestPrefix: 'ብሉጽ፦',
      play: 'ተጻወት',
      ranks: 'ደረጃ',
      comingSoon: 'ብቕልጡፍ',
      soon: 'ብቕልጡፍ',
      dailyDefault: 'ዕለታዊ',
      weeklyDefault: 'ሰሙናዊ',
      loading: 'ይጽዕን ኣሎ...',
      live: 'ቀጥታ',
      ended: 'ተወዲኡ',
      tapDailyRanks: 'ዕለታዊ ደረጃታት ንምርኣይ ጠውቑ',
      tapWeeklyPrizes: 'ሰሙናዊ ሽልማታት ንምርኣይ ጠውቑ',
      viewLeaderboardAria: (gameName) => `ሰሌዳ ደረጃ ${gameName} ርአ`,
    },
    registration: {
      cardKicker: 'ካርድ ተጻዋቲ Zblal Arcade',
      returningTitle: 'ነባር ተጻዋቲ',
      newPlayerTitle: 'ምዝገባ ሓድሽ ተጻዋቲ',
      entryModeAria: 'መእተዊ ዓይነት ተጻዋቲ',
      tabNewPlayer: 'ሓድሽ ተጻዋቲ',
      tabReturningPlayer: 'ነባር ተጻዋቲ',
      returningSubtitle:
        'ሳጓኹም፣ መለለዪኹምን ዝተዓቀቡ ነጥብታትኩምን ብቕጽበት ንምምላስ ቁጽሪ ሞባይል ኢትዮጵያኹም ጥራይ የእትዉ።',
      newPlayerSubtitle:
        'ሓንሳብ ሳጓን ቁጽሪ ሞባይል ኢትዮጵያን ምረጹ። ቀዋሚ መለለዪኹም ኣብ 5ቲኦም ጸወታታት ነጥብኹም ይሕዝ።',
      nicknameLabel: 'ሳጓ ተጻዋቲ',
      nicknamePlaceholder: 'ንኣብነት፦ PipeKing99',
      phoneLabel: 'ቁጽሪ ሞባይል ኢትዮጵያ',
      phonePlaceholder: '0911 223 344 ወይ +251 911 223 344',
      phoneHelp:
        'ናብ +251 ይቕየር። ኣብ ህዝባዊ ሰሌዳ ዝተሸፈነ ቁጽሪ ጥራይ ይርአ (+251 9•• ••• 123)።',
      errInvalidPhone:
        'ቅኑዕ ቁጽሪ ሞባይል ኢትዮጵያ የእትዉ (ንኣብነት 0911223344 ወይ +251911223344)።',
      errInvalidNickname: 'ካብ 2 ክሳብ 24 ፊደላት ዘለዎ ሳጓ የእትዉ።',
      errSaveProfile: 'ፕሮፋይል ምዕቃብ ኣይተኻእለን። ደጊምኩም ፈትኑ።',
      errFindProfile: 'ፕሮፋይል ክርከብ ኣይከኣለን። ደጊምኩም ፈትኑ።',
      errInvalidServerProfile: 'ሰርቨር ዘይምሉእ ፕሮፋይል መሊሱ። ደጊምኩም ፈትኑ።',
      errNotFoundForPhone:
        'በዚ ቁጽሪ ስልኪ ዝተመዝገበ ፕሮፋይል ኣይተረኽበን። ንምምዝጋብ ናብ ሓድሽ ተጻዋቲ ቀይሩ።',
      errSuspendedProfile: 'እዚ ፕሮፋይል ተኣጊዱ እዩ። ንሓገዝ ተወከሱ።',
      createFromLoginCta: 'በዚ ቁጽሪ ሓድሽ ፕሮፋይል ፍጠር',
      backToSite: 'ናብ መበገሲ',
      restoring: 'ይምለስ ኣሎ...',
      saving: 'ይዕቀብ ኣሎ...',
      restoreAndPlay: 'መልስ እሞ ተጻወት',
      createAndPlay: 'ፍጠር እሞ ተጻወት',
      noOtpTitle: 'OTP ኣየድልን · ብነጻ ተጻዊትኩም ስዓሩ',
      noOtpDetail1:
        'SMS፣ OTP ወይ ምስጢራዊ ቃል ኣየድልን። ነባራት ተጻወትቲ ብቁጽሪ ሞባይሎም ጥራይ ነጥቦም ይመልሱ።',
      noOtpDetail2:
        'ነጻ ተሳትፎ · ግዢ ኣየድልን · ሽልማት ቅድሚ ምርግጋጹ ነጥብታት ይምርመሩ፤ ትሕቲ 18 ዓመት ፍቓድ ወላዲ የድሊ።',
    },
    leaderboard: {
      overallTab: 'ሓፈሻዊ',
      periodDaily: 'ዕለታዊ',
      periodWeekly: 'ሰሙናዊ',
      periodAllTime: 'ናይ ኩሉ ግዜ',
      dailyChallenge: 'ዕለታዊ ውድድር',
      weeklyChallenge: 'ሰሙናዊ ውድድር',
      dailyPrizeFallback: 'ዕለታዊ ሓፈሻዊ ተዓዋትን መራሕቲ ጸወታን ብZblal ይረጋገጹ።',
      weeklyPrizeFallback: 'ውድድር ምስ ተዛዘመ ሰሙናዊ ተዓወትቲ ይምርመሩ።',
      endsPrefix: 'ዝውዳእ፦',
      midnightEat: 'ፍርቂ ለይቲ EAT',
      sundayMidnightEat: 'ሰንበት ፍርቂ ለይቲ EAT',
      refreshAria: 'ሰሌዳ ኣሐድስ',
      yourRank: 'ደረጃኹም፦',
      loadingOverall: 'ሓፈሻዊ ደረጃታት ይጽዕን ኣሎ...',
      loadingGame: 'ደረጃታት ጸወታ ይጽዕን ኣሎ...',
      tryAgain: 'ደጊምካ ፈትን',
      noScoresTitle: 'ገና ዝተመዝገበ ነጥቢ የለን',
      noScoresSubtitle: (periodLabel) =>
        `ኣብ ${periodLabel} ሰሌዳ ቀዳማይ ተጻዋቲ ኩኑ! #1 ንምሓዝ ተጻወቱ።`,
      rank1Label: '1ይ',
      rank2Label: '2ይ',
      rank3Label: '3ይ',
      youBadge: 'ንስኹም',
      youParen: '(ንስኹም)',
      pointsLabel: 'ነጥቢ',
      bestLabel: 'ብሉጽ',
      bestScoreLabel: 'ብሉጽ ነጥቢ',
      ptsUnit: 'ነጥቢ',
      tableRank: 'ደረጃ',
      tablePlayer: 'ተጻዋቲ',
      tablePhone: 'ስልኪ',
      tableTotalPoints: 'ጠቕላላ ነጥቢ',
      tableBestScore: 'ብሉጽ ነጥቢ',
      howRankingsWork: 'ደረጃን ሓፈሻዊ ነጥብን ከመይ ይስላዕ',
      rankingsExplanationPrefix: 'ነፍሲ ወከፍ ጸወታ ብ',
      rankingsExplanationStrong: 'ዝለዓለ ቅኑዕ ሓደ ጸወታ',
      rankingsExplanationSuffix: ' ይሰርዕ። ሓፈሻዊ ተዓዋቲ ነጥቢ ደረጃታት ይድምር፦',
      placementRanks: ['1ይ', '2ይ', '3ይ', '4ይ', '5ይ'],
      sixthPlusZero: '6ይ+፦ 0 ነጥቢ',
      recentApprovedWinners: 'ቀረባ እዋን ዝጸደቑ ተዓወትቲ',
      winnerVerificationInProgress: 'ምርግጋጽ ተዓወትቲ ይካየድ ኣሎ።',
      overallChampion: 'ሓፈሻዊ ሻምፕዮን',
      gameWinner: 'ተዓዋቲ ጸወታ',
      prizeLabel: 'ሽልማት፦',
      prizeStatuses: {
        unclaimed: 'ዘይተወስደ',
        contacted: 'ተዘራሪቦም',
        awarded: 'ተዋሂቡ',
        forfeited: 'ተሰሪዙ',
      },
    },
    shell: {
      backToGamesShort: 'ጸወታታት',
      backToGamesAria: 'ናብ ጸወታታት ተመለስ',
      unmuteAria: 'ድምጺ ክፈት',
      muteAria: 'ድምጺ ዕጸው',
      resume: 'ቀጽል',
      pause: 'ኣቋርጽ',
      restart: 'ደጊምካ',
      resumeAria: 'ጸወታ ቀጽል',
      pauseAria: 'ጸወታ ኣቋርጽ',
      restartAria: 'ጸወታ ደጊምካ ጀምር',
    },
    common: {
      scoreHud: 'ነጥቢ',
      bestHud: 'ብሉጽ',
      levelHud: 'ደረጃ',
      livesHud: 'ህይወት',
      chancesHud: 'ዕድል',
      startGame: 'ጸወታ ጀምር',
      gamePaused: 'ጸወታ ጠጠው ኢሉ',
      resume: 'ቀጽል',
      restart: 'ደጊምካ ጀምር',
      backToGames: 'ናብ ጸወታታት',
      playAgain: 'ደጊምካ ተጻወት',
      gameOver: 'ጸወታ ተወዲኡ',
      newPersonalBest: 'ሓድሽ ብሉጽ ውልቃዊ ነጥቢ!',
      scoreLabel: 'ነጥቢ፦',
      bestLabel: 'ብሉጽ፦',
      pauseLegendSpaceP: 'ኣቋርጽ፦ Space / P',
      pauseLegendP: 'ኣቋርጽ፦ P',
      restartLegendR: 'ደጊምካ፦ R',
      backLegendEsc: 'ተመለስ፦ Esc',
      livesRemainingAria: (lives) => `ዝተረፈ ህይወት፦ ${lives}`,
      chancesRemainingAria: (chances) => `ዝተረፈ ዕድል፦ ${chances}`,
    },
    poopMan: {
      title: 'ፖፕ ማን',
      ariaLabel: 'ጸወታ ፖፕ ማን',
      description:
          'ኩሉ ወረቐት ሽቓቕ ኣክቡ፣ ንቅልጣፈ ወርቃዊ ወረቐት ሓዙ፣ ካብ ጀርም ድማ ኣምልጡ!',
      mobileHint: 'ሞባይል፦ መጠወቒ ኣንፈት ወይ ኣንሸራትቱ',
      desktopHint: 'ኮምፕዩተር፦ Arrow Keys ወይ WASD',
      legendMove: 'ምንቅስቓስ፦ Arrow Keys / WASD',
      moveUpAria: 'ንላዕሊ ኪድ',
      moveLeftAria: 'ንጸጋም ኪድ',
      moveDownAria: 'ንታሕቲ ኪድ',
      moveRightAria: 'ንየማን ኪድ',
      levelClearedBonus: (level, bonus) => `ደረጃ ${level} ተዛዚሙ · +${bonus} ቦነስ`,
      victoryHeading: 'ቱቦታት ጸሪዮም!',
      victoryBody: 'ፖፕ ማን ኩሉ ወረቐት ጸሪጉ። ንዝቀልጠፉ ጀርምታት ድሉዋት ዲኹም?',
      nextLevel: 'ቀጻሊ ደረጃ',
      cloggedOutLevel: (level) => `ተዓጽዩ · ደረጃ ${level}`,
      niceRun: (nickname) => (nickname ? `ጽቡቕ ጉያ፣ ${nickname}!` : 'ጸወታ ተወዲኡ'),
    },
    toiletBasketball: {
      title: 'ቅርጫት ኩዕሶ ሽቓቕ',
      ariaLabel: 'ጸወታ ቅርጫት ኩዕሶ ሽቓቕ',
      mobileHint: 'ንምድርባይ ኩዕሶ ንድሕሪት ስሒብኩም ሕደጉ!',
      legendAim: 'ኣነጻጽር፦ ኩዕሶ ንድሕሪት ስሒብካ ሕደግ',
      legendSwish: 'ቀጥታ ምእታው +2 ነጥቢ ይህብ',
      streak: (n) => `${n}x ተኸታታሊ`,
      wind: 'ንፋስ',
      roundComplete: '3 ስሕተት · ዙር ተዛዚሙ',
      niceShooting: (nickname) =>
        `ጽቡቕ ምድርባይ${nickname ? `፣ ${nickname}` : ''}!`,
      madeLabel: 'ዝኣተወ፦',
      brickLeftCallout: (remaining) => `ስሒቱ! ${remaining} ተሪፉ`,
      gameOverCallout: 'ተወዲኡ!',
      swishCallout: (pts) => `+${pts} ቀጥታ!`,
      splashCallout: (pts) => `+${pts} ኣትዩ!`,
    },
    poopDrop: {
      title: 'ፖፕ ድሮፕ',
      ariaLabel: 'ጸወታ ፖፕ ድሮፕ',
      description:
        'ዝወድቁ ፖፕን ወርቃዊ ወረቐትን ብባልዲኹም ሓዙ! ጀርምን ከቢድ መፍትሕን ኣምልጡ።',
      mobileHint: 'ሞባይል፦ ኣንሸራትቱ ወይ ጸጋም / የማን ጠውቑ',
      desktopHint: 'ኮምፕዩተር፦ ጸጋም / የማን Arrow Keys ወይ A / D',
      legendMove: 'ምንቅስቓስ፦ ጸጋም / የማን Arrow ወይ A / D (ወይ ስሓብ)',
      streak: (combo, mult) =>
        mult > 1 ? `${combo} ተኸታታሊ (${mult}x)` : `${combo} ተኸታታሊ`,
      leftBtn: 'ጸጋም',
      rightBtn: 'የማን',
      moveLeftAria: 'ባልዲ ንጸጋም ውሰድ',
      moveRightAria: 'ባልዲ ንየማን ውሰድ',
      bucketFull: 'ባልዲ መሊኡ!',
      niceCatching: (nickname) =>
        `ጽቡቕ ምሓዝ${nickname ? `፣ ${nickname}` : ''}!`,
      caughtLabel: 'ዝተታሕዙ፦',
      oopsCallout: 'ውይ! -1 ♥',
      splatCallout: 'ተበላሽዩ! -1 ♥',
      goldCallout: (pts) => `+${pts} ወርቂ!`,
    },
    poopRun: {
      title: 'ጉያ ፖፕ',
      ariaLabel: 'ጸወታ ጉያ ፖፕ',
      description:
        'ኣብ ሽቓቕ ጉየዩ! መዕገቲታት ዝለሉ፣ ትሕቲ ቱቦታት ተንሸራተቱ፣ ወረቐት ኣክቡ።',
      mobileHint: 'ሞባይል፦ ዝለል / ተንሸራተት ጠውቑ ወይ ንላዕሊ / ታሕቲ ኣንሸራትቱ',
      desktopHint: 'ኮምፕዩተር፦ Up / W / Space ንምዝላል · Down / S ንምንሽርታት',
      legendJump: 'ዝለል፦ Space / Up / W',
      legendSlide: 'ተንሸራተት፦ Down / S',
      distHud: 'ርሕቀት',
      rollsHud: 'ወረቐት',
      speedSuffix: 'ቅል',
      slideBtn: 'ተንሸራተት',
      jumpBtn: 'ዝለል',
      startRun: 'ጉያ ጀምር',
      runPaused: 'ጉያ ጠጠው ኢሉ',
      sprintComplete: (meters) => `ጉያ ${meters}ሜ ተዛዚሙ`,
      greatSprint: (nickname) =>
        `ብሉጽ ጉያ${nickname ? `፣ ${nickname}` : ''}!`,
      wipedOut: 'ወዲቑ!',
      rollsLabel: 'ወረቐት፦',
      duckCallout: 'ተዓጸፍ!',
      shieldCallout: (pts) => `+${pts} ዋልታ!`,
      shieldSavedCallout: 'ዋልታ ኣድሒኑ!',
    },
    dontDrop: {
      title: 'ነቲ ፑፕ ኣይተውድቆ',
      ariaLabel: 'ጸወታ ነቲ ፑፕ ኣይተውድቆ',
      description:
        'ነቲ ፑፕ ኣብ ኣየር ኣንሳፍፍዎ! ብመንጎ ቱቦታት ንፈሩ፣ ወርቃዊ ወረቐት ሓዙ፣ ካብ መሬትን ጀርምን ተጠንቀቑ።',
      mobileHint: 'ሞባይል፦ ዝኾነ ቦታ ጠውቑ ወይ ኣንሳፍፍ ተጫኑ',
      desktopHint: 'ኮምፕዩተር፦ Click / Space / Up Arrow / W',
      legendBounce: 'ኣንሳፍፍ፦ Click / Space / Up / W',
      gatesHud: 'መዓጹ',
      tapToBounce: 'ንምንስፋፍ ጠውቑ',
      startBouncing: 'ምንስፋፍ ጀምር',
      gatesClearedLabel: (gates) => `${gates} መዓጹ ተሓሊፎም`,
      niceFlying: (nickname) =>
        `ጽቡቕ በረራ${nickname ? `፣ ${nickname}` : ''}!`,
      dropped: 'ወዲቑ!',
      gatesLabel: 'መዓጹ፦',
      gatesMilestoneCallout: (gates) => `${gates} መዓጹ!`,
      goldBonusCallout: '+5 ወርቂ!',
    },
  },
};
