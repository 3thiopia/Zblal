import type { ServicePriorityCode } from '../config/popoConfig.ts';
import type { LanguageCode } from './locationTranslations.ts';

export interface TranslationDictionary {
  meta: {
    brandName: string;
    pageTitle: string;
    htmlLang: string;
    isEthiopic: boolean;
  };
  nav: {
    about: string;
    register: string;
  };
  intro: {
    skip: string;
    phrases: [string, string, string, string];
  };
  form: {
    customerNameLabel: string;
    customerNamePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    subcityLabel: string;
    subcityPlaceholder: string;
    subcitySearchPlaceholder: string;
    subcitySheetTitle: string;
    locationLabel: string;
    locationPlaceholder: string;
    locationDisabledPlaceholder: string;
    locationSearchPlaceholder: string;
    locationSheetTitleSuffix: string;
    noMatchingLocations: string;
    closeSelector: string;
    clearSearch: string;
    servicePriorityLabel: string;
    orderSummaryLabel: string;
    loadingSubcities: string;
    loadingLocations: string;
    loadingPriorities: string;
    retryButton: string;
    subcitiesLoadError: string;
    locationsLoadError: string;
    prioritiesLoadError: string;
    noSubcitiesAvailable: string;
    noLocationsAvailable: string;
    noPrioritiesAvailable: string;
    submitButton: string;
    submittingButton: string;
    errors: {
      customerName: string;
      phoneNumber: string;
      subcity: string;
      specificLocation: string;
      servicePriority: string;
      genericSubmit: string;
      networkError: string;
    };
  };
  tiers: Record<
    ServicePriorityCode,
    {
      label: string;
      timeframe: string;
      formatPrice: (priceEtb: number | null, fallback: string) => string;
    }
  >;
  confirmation: {
    heading: string;
    refLabel: string;
    copyAriaLabel: string;
    customerName: string;
    phoneNumber: string;
    location: string;
    servicePriority: string;
    servicePrice: string;
    expectedTimeframe: string;
    backButton: string;
  };
  about: {
    title: string;
    topToiletPhrases: [string, string, string, string];
    streamPhrases: [string, string, string, string, string];
    whoWeAre: {
      kicker: string;
      heading: string;
      body: string;
    };
    whatWeDo: {
      kicker: string;
      heading: string;
      body: string;
    };
    howItWorks: {
      kicker: string;
      heading: string;
      steps: [string, string, string, string, string];
    };
    priorities: {
      kicker: string;
      heading: string;
    };
    finale: {
      messyText: string;
      flushingText: string;
      fixItButton: string;
      cleaningButton: string;
      happyBubble: string;
      solvedHeading: string;
      registerNowButton: string;
      replayButton: string;
    };
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  AM: {
    meta: {
      brandName: 'ዝብላል',
      pageTitle: 'ዝብላል — የሴፕቲክ ታንክ መምጠጥ ምዝገባ',
      htmlLang: 'am',
      isEthiopic: true,
    },
    nav: {
      about: 'ስለ ዝብላል',
      register: 'ይመዝገቡ',
    },
    intro: {
      skip: 'ዝለል',
      phrases: [
        'መቼም የወለደ አንጀት አይጨክንም',
        'ተጠቅመህብኝ እማ የትም አትጥለኝም',
        'ዘመዴ',
        'አባ',
      ],
    },
    form: {
      customerNameLabel: 'የደንበኛ ስም',
      customerNamePlaceholder: 'ሙሉ ስምዎን ያስገቡ',
      phoneLabel: 'ስልክ ቁጥር',
      phonePlaceholder: '91 122 3344',
      subcityLabel: 'ክፍለ ከተማ',
      subcityPlaceholder: 'ክፍለ ከተማ ይምረጡ',
      subcitySearchPlaceholder: 'የአዲስ አበባ ክፍለ ከተማ ይፈልጉ...',
      subcitySheetTitle: 'ክፍለ ከተማ ይምረጡ',
      locationLabel: 'ልዩ ቦታ',
      locationPlaceholder: 'ልዩ ቦታ ይምረጡ',
      locationDisabledPlaceholder: 'መጀመሪያ ክፍለ ከተማ ይምረጡ',
      locationSearchPlaceholder: 'ሰፈር ወይም አካባቢ ይፈልጉ...',
      locationSheetTitleSuffix: 'አካባቢዎች',
      noMatchingLocations: 'ተዛማጅ ቦታ አልተገኘም።',
      closeSelector: 'ዝጋ',
      clearSearch: 'ፍለጋ አጽዳ',
      servicePriorityLabel: 'የአገልግሎት ቅድሚያ',
      orderSummaryLabel: 'የትዕዛዝ ማጠቃለያ',
      loadingSubcities: 'ክፍለ ከተሞችን በመጫን ላይ...',
      loadingLocations: 'ቦታዎችን በመጫን ላይ...',
      loadingPriorities: 'የአገልግሎት አማራጮችን በመጫን ላይ...',
      retryButton: 'እንደገና ሞክር',
      subcitiesLoadError: 'ክፍለ ከተሞችን ከመረጃ ቋት ማምጣት አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
      locationsLoadError: 'የዚህን ክፍለ ከተማ ቦታዎች ማምጣት አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
      prioritiesLoadError: 'የአገልግሎት ቅድሚያዎችን እና ዋጋዎችን ማምጣት አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
      noSubcitiesAvailable: 'በአሁኑ ጊዜ ምንም ንቁ ክፍለ ከተማ አልተገኘም።',
      noLocationsAvailable: 'ለዚህ ክፍለ ከተማ ምንም ንቁ ቦታ አልተገኘም።',
      noPrioritiesAvailable: 'በአሁኑ ጊዜ ምንም ንቁ የአገልግሎት አማራጭ አልተገኘም።',
      submitButton: 'ይመዝገቡ',
      submittingButton: 'በመመዝገብ ላይ...',
      errors: {
        customerName: 'እባክዎ ሙሉ ስምዎን ያስገቡ።',
        phoneNumber: 'በ9 ወይም በ7 የሚጀምር ትክክለኛ ባለ 9 አሃዝ የኢትዮጵያ ስልክ ቁጥር ያስገቡ።',
        subcity: 'እባክዎ ክፍለ ከተማዎን ይምረጡ።',
        specificLocation: 'እባክዎ ልዩ ቦታዎን ይምረጡ።',
        servicePriority: 'እባክዎ የአገልግሎት ቅድሚያ ይምረጡ።',
        genericSubmit: 'ምዝገባውን ማጠናቀቅ አልተቻለም።',
        networkError: 'የኔትወርክ ችግር አጋጥሟል። እባክዎ ግንኙነትዎን አረጋግጠው እንደገና ይሞክሩ።',
      },
    },
    tiers: {
      STANDARD: {
        label: 'መደበኛ',
        timeframe: 'ከ3–5 ቀናት',
        formatPrice: (price, fallback) =>
          price !== null ? `${price.toLocaleString('en-US')} ብር` : fallback,
      },
      PREMIUM: {
        label: 'ፕሪሚየም',
        timeframe: 'ከ1–2 ቀናት',
        formatPrice: (price, fallback) =>
          price !== null ? `${price.toLocaleString('en-US')} ብር` : fallback,
      },
      SUPER_FAST: {
        label: 'እጅግ ፈጣን',
        timeframe: 'በ24 ሰዓት ውስጥ',
        formatPrice: (price, fallback) =>
          price !== null ? `${price.toLocaleString('en-US')} ብር` : fallback,
      },
    },
    confirmation: {
      heading: 'ምዝገባዎ ተረጋግጧል',
      refLabel: 'መለያ ቁጥር',
      copyAriaLabel: 'የምዝገባ ቁጥር ቅዳ',
      customerName: 'የደንበኛ ስም',
      phoneNumber: 'ስልክ ቁጥር',
      location: 'አድራሻ',
      servicePriority: 'የአገልግሎት ቅድሚያ',
      servicePrice: 'የአገልግሎት ዋጋ',
      expectedTimeframe: 'የሚጠበቅ ጊዜ',
      backButton: 'ወደ ምዝገባ ገጽ ይመለሱ',
    },
    about: {
      title: 'ታላቁ ጽዳት',
      topToiletPhrases: [
        'እረ ብሮ ምን ሆነሃል?',
        'ወይ በለኝ እንጂ ሜን!',
        'ረዳት! ከዚህ በላይ አይጭንም? ፍታ!',
        'ምኑ ጋር ልታስቀምጠው ነው?',
      ],
      streamPhrases: [
        'አሁንስ መረረኝ',
        'ሊያስመልሰኝ ነው!',
        'ምንድነው የሚሸተው',
        'የዛሬው ደሞ ዱባ ነው መሰለኝ',
        'እረ የሰው ያለህ',
      ],
      whoWeAre: {
        kicker: '01 · እኛ ማን ነን',
        heading: 'ንጹህ እና ቀልጣፋ የንጽህና አገልግሎት',
        body: 'ዝብላል ለመኖሪያ ቤቶች፣ ለህንጻዎች እና ለንግድ ተቋማት ንጹህና የተስተካከለ የፍሳሽ ማስወገጃ ስርዓት እንዲኖራቸው የሚያግዝ የሴፕቲክ ታንክ መምጠጥ አገልግሎት ነው።',
      },
      whatWeDo: {
        kicker: '02 · ምን እንሰራለን',
        heading: 'የተደራጀ የሴፕቲክ ታንክ መምጠጥ',
        body: 'ዝብላል የሴፕቲክ ታንክ መምጠጥ እና ቆሻሻ የማስወገድ አገልግሎት በመስጠት ደንበኞች የሞሉ ሴፕቲክ ታንኮችን በተደራጀ የአገልግሎት ሂደት እንዲያጸዱ ይረዳል።',
      },
      howItWorks: {
        kicker: '03 · አገልግሎታችን እንዴት ይሰራል',
        heading: 'አምስት ቀላል ደረጃዎች',
        steps: [
          'ደንበኞች ስማቸውን እና ስልክ ቁጥራቸውን ያስገባሉ።',
          'ደንበኞች ክፍለ ከተማቸውን እና ልዩ ቦታቸውን ይመርጣሉ።',
          'ደንበኞች መደበኛ፣ ፕሪሚየም ወይም እጅግ ፈጣን አገልግሎት ይመርጣሉ።',
          'ዝብላል ምዝገባቸውን ይቀበላል።',
          'አገልግሎቱ በተመረጠው ቅድሚያ እና በተረጋገጠው ተራ መሰረት ይዘጋጃል።',
        ],
      },
      priorities: {
        kicker: '04 · የአገልግሎት ቅድሚያዎቻችን',
        heading: 'ፍጥነትዎን ይምረጡ',
      },
      finale: {
        messyText: 'እዚህ ጋር ነገሮች ትንሽ ተበላሽተዋል።',
        flushingText: 'መስመሩን በማጽዳት ላይ...',
        fixItButton: 'አስተካክለው!',
        cleaningButton: 'በማጽዳት ላይ...',
        happyBubble: 'ገላገልከኝ!',
        solvedHeading: 'ችግሩ ተፈቷል። ሁሉም ነገር ደስ ይላል።',
        registerNowButton: 'አሁኑኑ ይመዝገቡ',
        replayButton: 'እንደገና ይጫወቱ',
      },
    },
  },

  ENG: {
    meta: {
      brandName: 'Zblal',
      pageTitle: 'Zblal — Septic Tank Emptying Registration',
      htmlLang: 'en',
      isEthiopic: false,
    },
    nav: {
      about: 'About',
      register: 'Register',
    },
    intro: {
      skip: 'Skip',
      phrases: [
        'A parent’s heart is never cruel',
        'Surely you won’t abandon me after using me',
        'My relative',
        'Dad',
      ],
    },
    form: {
      customerNameLabel: 'Customer Name',
      customerNamePlaceholder: 'Enter your full name',
      phoneLabel: 'Phone Number',
      phonePlaceholder: '91 122 3344',
      subcityLabel: 'Subcity',
      subcityPlaceholder: 'Select subcity',
      subcitySearchPlaceholder: 'Search Addis Ababa subcities...',
      subcitySheetTitle: 'Select Subcity',
      locationLabel: 'Specific Location',
      locationPlaceholder: 'Select location',
      locationDisabledPlaceholder: 'Select subcity first',
      locationSearchPlaceholder: 'Search neighborhood or area...',
      locationSheetTitleSuffix: 'Locations',
      noMatchingLocations: 'No matching locations found.',
      closeSelector: 'Close selector',
      clearSearch: 'Clear search',
      servicePriorityLabel: 'Service Priority',
      orderSummaryLabel: 'Order Summary',
      loadingSubcities: 'Loading subcities...',
      loadingLocations: 'Loading neighborhoods...',
      loadingPriorities: 'Loading service options...',
      retryButton: 'Retry',
      subcitiesLoadError: 'Could not load subcities from the database. Please try again.',
      locationsLoadError: 'Could not load neighborhoods for this subcity. Please try again.',
      prioritiesLoadError: 'Could not load service priorities and pricing. Please try again.',
      noSubcitiesAvailable: 'No active subcities are currently available.',
      noLocationsAvailable: 'No active neighborhoods found for this subcity.',
      noPrioritiesAvailable: 'No active service options are currently available.',
      submitButton: 'REGISTER',
      submittingButton: 'REGISTERING...',
      errors: {
        customerName: 'Please enter your full name.',
        phoneNumber:
          'Enter a valid 9-digit Ethiopian mobile number starting with 9 or 7.',
        subcity: 'Please select your subcity.',
        specificLocation: 'Please select your specific location.',
        servicePriority: 'Please choose a service priority.',
        genericSubmit: 'Could not complete registration.',
        networkError: 'Network error. Please check your connection and try again.',
      },
    },
    tiers: {
      STANDARD: {
        label: 'STANDARD',
        timeframe: '3–5 days',
        formatPrice: (price, fallback) =>
          price !== null ? `${price.toLocaleString('en-US')} ETB` : fallback,
      },
      PREMIUM: {
        label: 'PREMIUM',
        timeframe: '1–2 days',
        formatPrice: (price, fallback) =>
          price !== null ? `${price.toLocaleString('en-US')} ETB` : fallback,
      },
      SUPER_FAST: {
        label: 'SUPER FAST',
        timeframe: 'Within 24 hours',
        formatPrice: (price, fallback) =>
          price !== null ? `${price.toLocaleString('en-US')} ETB` : fallback,
      },
    },
    confirmation: {
      heading: 'Registration Confirmed',
      refLabel: 'Ref',
      copyAriaLabel: 'Copy registration number',
      customerName: 'Customer Name',
      phoneNumber: 'Phone Number',
      location: 'Location',
      servicePriority: 'Service Priority',
      servicePrice: 'Service Price',
      expectedTimeframe: 'Expected Timeframe',
      backButton: 'Back to Registration',
    },
    about: {
      title: 'The Big Cleanup',
      topToiletPhrases: [
        'Hey bro, what happened to you?',
        'Come on man, give me a break!',
        'Helper! Won’t this hold any more? Untie it!',
        'Where are you planning to put that?',
      ],
      streamPhrases: [
        'I’ve really had enough now',
        'I’m going to throw up!',
        'What on earth is that smell?',
        'Today’s must be pumpkin I think',
        'Somebody help!',
      ],
      whoWeAre: {
        kicker: '01 · Who We Are',
        heading: 'Clean & Functional Sanitation',
        body: 'Zblal is a septic tank emptying service dedicated to helping households, properties, and businesses maintain clean and functional sanitation systems.',
      },
      whatWeDo: {
        kicker: '02 · What We Do',
        heading: 'Organized Septic Emptying',
        body: 'Zblal provides septic tank emptying and waste removal services, helping customers deal with full septic tanks through an organized service process.',
      },
      howItWorks: {
        kicker: '03 · How Our Service Works',
        heading: 'Five Simple Steps',
        steps: [
          'Customers submit their name and phone number.',
          'Customers select their subcity and specific location.',
          'Customers choose Standard, Premium, or Super Fast.',
          'Zblal receives their registration.',
          'The service is arranged according to the selected priority and confirmed availability.',
        ],
      },
      priorities: {
        kicker: '04 · Our Service Priorities',
        heading: 'Choose Your Speed',
      },
      finale: {
        messyText: 'Things got a little messy down here.',
        flushingText: 'Clearing the pipes...',
        fixItButton: 'FIX IT!',
        cleaningButton: 'CLEANING...',
        happyBubble: 'You saved me!',
        solvedHeading: 'Problem solved. Everything feels better.',
        registerNowButton: 'REGISTER NOW',
        replayButton: 'Replay',
      },
    },
  },

  ORO: {
    meta: {
      brandName: 'Zblal',
      pageTitle: 'Zblal — Galmee Tajaajila Qulqulleessaa',
      htmlLang: 'om',
      isEthiopic: false,
    },
    nav: {
      about: "Waa'ee Zblal",
      register: "Galmaa'i",
    },
    intro: {
      skip: 'Irra darbi',
      phrases: [
        'Garaan dhale hin jabaatu',
        'Erga natti fayyadamtee bakkeetti nan gatin',
        'Fira koo',
        'Abbaa',
      ],
    },
    form: {
      customerNameLabel: 'Maqaa Maamilaa',
      customerNamePlaceholder: 'Maqaa keessan guutuu galchaa',
      phoneLabel: 'Lakkoofsa Bilbilaa',
      phonePlaceholder: '91 122 3344',
      subcityLabel: 'Kutaa Magaalaa',
      subcityPlaceholder: 'Kutaa magaalaa filadhaa',
      subcitySearchPlaceholder: 'Kutaa magaalaa Finfinnee barbaadaa...',
      subcitySheetTitle: 'Kutaa Magaalaa Filadhaa',
      locationLabel: 'Bakka Addaa',
      locationPlaceholder: 'Bakka filadhaa',
      locationDisabledPlaceholder: 'Dura kutaa magaalaa filadhaa',
      locationSearchPlaceholder: 'Naannoo ykn ganda barbaadaa...',
      locationSheetTitleSuffix: 'Naannoowwan',
      noMatchingLocations: 'Bakki walsimu hin argamne.',
      closeSelector: 'Cufi',
      clearSearch: 'Barbaacha haqi',
      servicePriorityLabel: 'Sadarkaa Tajaajilaa',
      orderSummaryLabel: 'Gabaabina Ajajaa',
      loadingSubcities: 'Kutaalee magaalaa fe’aa jira...',
      loadingLocations: 'Naannoowwan fe’aa jira...',
      loadingPriorities: 'Filannoowwan tajaajilaa fe’aa jira...',
      retryButton: 'Irra deebi’i yaali',
      subcitiesLoadError: 'Kutaalee magaalaa kuusaa deetaa irraa fiduun hin danda’amne. Maaloo irra deebi’aa yaalaa.',
      locationsLoadError: 'Naannoowwan kutaa magaalaa kanaa fiduun hin danda’amne. Maaloo irra deebi’aa yaalaa.',
      prioritiesLoadError: 'Sadarkaalee tajaajilaa fi gatii fiduun hin danda’amne. Maaloo irra deebi’aa yaalaa.',
      noSubcitiesAvailable: 'Yeroo ammaa kutaan magaalaa hojii irra jiru hin argamne.',
      noLocationsAvailable: 'Kutaa magaalaa kanaaf naannoon hojii irra jiru hin argamne.',
      noPrioritiesAvailable: 'Yeroo ammaa filannoon tajaajilaa hojii irra jiru hin argamne.',
      submitButton: "GALMAA'I",
      submittingButton: "GALMAA'AA JIRA...",
      errors: {
        customerName: 'Maaloo maqaa keessan guutuu galchaa.',
        phoneNumber:
          'Lakkoofsa bilbilaa Itoophiyaa dijiitii 9 kan 9 ykn 7 jalqabu sirrii galchaa.',
        subcity: 'Maaloo kutaa magaalaa keessan filadhaa.',
        specificLocation: 'Maaloo bakka addaa keessan filadhaa.',
        servicePriority: 'Maaloo sadarkaa tajaajilaa filadhaa.',
        genericSubmit: 'Galmeen xumuramuu hin dandeenye.',
        networkError: 'Rakkoo interneetii. Maaloo walitti hidhamiinsa keessan ilaalaa irra deebi’aa yaalaa.',
      },
    },
    tiers: {
      STANDARD: {
        label: 'IDILEE',
        timeframe: 'Guyyaa 3–5',
        formatPrice: (price, fallback) =>
          price !== null ? `Birrii ${price.toLocaleString('en-US')}` : fallback,
      },
      PREMIUM: {
        label: 'PIRIIMIYEEMII',
        timeframe: 'Guyyaa 1–2',
        formatPrice: (price, fallback) =>
          price !== null ? `Birrii ${price.toLocaleString('en-US')}` : fallback,
      },
      SUPER_FAST: {
        label: 'BAAY’EE ARIIFATAA',
        timeframe: 'Sa’aatii 24 keessatti',
        formatPrice: (price, fallback) =>
          price !== null ? `Birrii ${price.toLocaleString('en-US')}` : fallback,
      },
    },
    confirmation: {
      heading: 'Galmeen Keessan Mirkaneeffameera',
      refLabel: 'Lak. Wabii',
      copyAriaLabel: 'Lakkoofsa galmee waraabi',
      customerName: 'Maqaa Maamilaa',
      phoneNumber: 'Lakkoofsa Bilbilaa',
      location: 'Bakka',
      servicePriority: 'Sadarkaa Tajaajilaa',
      servicePrice: 'Gatii Tajaajilaa',
      expectedTimeframe: 'Yeroo Eegamu',
      backButton: "Gara Galmeetti Deebi'i",
    },
    about: {
      title: 'Qulqulleessa Guddaa',
      topToiletPhrases: [
        'Yaa obboleesso, maaltu si mudate?',
        'Yaa jaallii koo, mee na dhiisi!',
        'Gargaaraa! Kana caalaa hin baatuu? Hiiki!',
        'Eessa kaa’uuf yaadda?',
      ],
      streamPhrases: [
        'Amma garuu nuffeera',
        'Na haqqisiisuuf jedha!',
        'Maaltu akkana ajaa’a?',
        'Kan har’aa kun duba natti fakkaata',
        'Yaa namaa na qaqqabaa!',
      ],
      whoWeAre: {
        kicker: '01 · Nuti Eenyu',
        heading: 'Qulqullinaa fi Sirna Fayyaa Qabu',
        body: 'Zblal tajaajila kuusaa xurii (septic tank) xuuxuu fi qulqulleessuu kan manneen jireenyaa, gamoo fi dhaabbileen daldalaa sirna qulqullinaa qulqulluu fi hojjetu akka qabaatan gargaaruudha.',
      },
      whatWeDo: {
        kicker: '02 · Maal Hojjenna',
        heading: 'Qulqulleessuu Qindaawaa',
        body: 'Zblal tajaajila kuusaa xurii xuuxuu fi balfa kaasuu kennuun, maamiltoonni kuusaa guute adeemsa tajaajilaa qindaawaadhaan akka furatan gargaara.',
      },
      howItWorks: {
        kicker: '03 · Tajaajilli Keenya Akkamitti Hojjeta',
        heading: 'Tarkaanfiiwwan Salphaa Shan',
        steps: [
          'Maamiltoonni maqaa fi lakkoofsa bilbilaa isaanii galchu.',
          'Maamiltoonni kutaa magaalaa fi bakka addaa isaanii filatu.',
          'Maamiltoonni Idilee, Piriimiyeemii ykn Baay’ee Ariifataa filatu.',
          'Zblal galmee isaanii fudhata.',
          'Tajaajilli akkaataa sadarkaa filatamee fi yeroo argameetti qophaa’a.',
        ],
      },
      priorities: {
        kicker: '04 · Sadarkaalee Tajaajila Keenyaa',
        heading: 'Ariitii Keessan Filadhaa',
      },
      finale: {
        messyText: 'Asitti wanti hundi xiqqoo badii ta’eera.',
        flushingText: 'Ujummoo qulqulleessaa jira...',
        fixItButton: 'SIRREESSI!',
        cleaningButton: 'QULQULLEESSAA JIRA...',
        happyBubble: 'Na boqochiifte!',
        solvedHeading: 'Rakkoon furameera. Wanti hundi gaarii ta’eera.',
        registerNowButton: "AMMA GALMAA'I",
        replayButton: "Irra Deebi'i",
      },
    },
  },

  TIG: {
    meta: {
      brandName: 'Zblal',
      pageTitle: 'Zblal — ምዝገባ ምጽራይ ሴፕቲክ ታንክ',
      htmlLang: 'ti',
      isEthiopic: true,
    },
    nav: {
      about: 'ብዛዕባ Zblal',
      register: 'ተመዝገብ',
    },
    intro: {
      skip: 'ዝለል',
      phrases: [
        'ልቢ ወላዲ መዓስ ይጨክን',
        'ተጠቒምካለይ ደኣ ኣበይ ክትድርብየኒ',
        'ዘመደይ',
        'ኣባ',
      ],
    },
    form: {
      customerNameLabel: 'ስም ዓሚል',
      customerNamePlaceholder: 'ምሉእ ስምኩም ኣእትዉ',
      phoneLabel: 'ቁጽሪ ስልኪ',
      phonePlaceholder: '91 122 3344',
      subcityLabel: 'ክፍለ ከተማ',
      subcityPlaceholder: 'ክፍለ ከተማ ምረጹ',
      subcitySearchPlaceholder: 'ክፍለ ከተማ ኣዲስ ኣበባ ድለዩ...',
      subcitySheetTitle: 'ክፍለ ከተማ ምረጹ',
      locationLabel: 'ፍሉይ ቦታ',
      locationPlaceholder: 'ፍሉይ ቦታ ምረጹ',
      locationDisabledPlaceholder: 'ቅድሚኡ ክፍለ ከተማ ምረጹ',
      locationSearchPlaceholder: 'ገዛውቲ ወይ ከባቢ ድለዩ...',
      locationSheetTitleSuffix: 'ከባቢታት',
      noMatchingLocations: 'ዝሰማማዕ ቦታ ኣይተረኽበን።',
      closeSelector: 'ዕጸው',
      clearSearch: 'ምድላይ ኣጽሪ',
      servicePriorityLabel: 'ቅድሚት ኣገልግሎት',
      orderSummaryLabel: 'ጽማቕ ትእዛዝ',
      loadingSubcities: 'ክፍለ ከተማታት ይጽዕን ኣሎ...',
      loadingLocations: 'ከባቢታት ይጽዕን ኣሎ...',
      loadingPriorities: 'ኣማራጺታት ኣገልግሎት ይጽዕን ኣሎ...',
      retryButton: 'ደጊምካ ፈትን',
      subcitiesLoadError: 'ክፍለ ከተማታት ካብ ዳታቤዝ ምምጻእ ኣይተኻእለን። በጃኹም ደጊምኩም ፈትኑ።',
      locationsLoadError: 'ናይዚ ክፍለ ከተማ ከባቢታት ምምጻእ ኣይተኻእለን። በጃኹም ደጊምኩም ፈትኑ።',
      prioritiesLoadError: 'ቅድሚት ኣገልግሎትን ዋጋታትን ምምጻእ ኣይተኻእለን። በጃኹም ደጊምኩም ፈትኑ።',
      noSubcitiesAvailable: 'ኣብዚ እዋን ዝሰርሕ ክፍለ ከተማ ኣይተረኽበን።',
      noLocationsAvailable: 'ነዚ ክፍለ ከተማ ዝሰርሕ ከባቢ ኣይተረኽበን።',
      noPrioritiesAvailable: 'ኣብዚ እዋን ዝሰርሕ ኣማራጺ ኣገልግሎት ኣይተረኽበን።',
      submitButton: 'ተመዝገብ',
      submittingButton: 'ይምዝገብ ኣሎ...',
      errors: {
        customerName: 'በጃኹም ምሉእ ስምኩም ኣእትዉ።',
        phoneNumber: 'ብ9 ወይ ብ7 ዝጅምር ቅኑዕ 9 ኣሃዝ ቁጽሪ ስልኪ ኢትዮጵያ ኣእትዉ።',
        subcity: 'በጃኹም ክፍለ ከተማኹም ምረጹ።',
        specificLocation: 'በጃኹም ፍሉይ ቦታኹም ምረጹ።',
        servicePriority: 'በጃኹም ቅድሚት ኣገልግሎት ምረጹ።',
        genericSubmit: 'ምዝገባ ክዛዘም ኣይከኣለን።',
        networkError: 'ናይ ኔትዎርክ ጸገም ኣጋጢሙ። በጃኹም ርክብኩም ኣረጋጊጽኩም ደጊምኩም ፈትኑ።',
      },
    },
    tiers: {
      STANDARD: {
        label: 'ስሩዕ',
        timeframe: 'ካብ 3–5 መዓልቲ',
        formatPrice: (price, fallback) =>
          price !== null ? `${price.toLocaleString('en-US')} ብር` : fallback,
      },
      PREMIUM: {
        label: 'ፕሪምየም',
        timeframe: 'ካብ 1–2 መዓልቲ',
        formatPrice: (price, fallback) =>
          price !== null ? `${price.toLocaleString('en-US')} ብር` : fallback,
      },
      SUPER_FAST: {
        label: 'ብጣዕሚ ቅልጡፍ',
        timeframe: 'ኣብ ውሽጢ 24 ሰዓት',
        formatPrice: (price, fallback) =>
          price !== null ? `${price.toLocaleString('en-US')} ብር` : fallback,
      },
    },
    confirmation: {
      heading: 'ምዝገባኹም ተረጋጊጹ',
      refLabel: 'መለለዪ ቁጽሪ',
      copyAriaLabel: 'ቁጽሪ ምዝገባ ቅዳሕ',
      customerName: 'ስም ዓሚል',
      phoneNumber: 'ቁጽሪ ስልኪ',
      location: 'ኣድራሻ',
      servicePriority: 'ቅድሚት ኣገልግሎት',
      servicePrice: 'ዋጋ ኣገልግሎት',
      expectedTimeframe: 'ዝጽበ ግዜ',
      backButton: 'ናብ ምዝገባ ተመለስ',
    },
    about: {
      title: 'ዓብዪ ጽሬት',
      topToiletPhrases: [
        'ዋይ ሓወይ እንታይ ኮይንካ?',
        'በጃኻ እስከ ሓድገኒ ሜን!',
        'ሓጋዚ! ካብዚ ንላዕሊ ኣይጽዕንን? ፍታሕ!',
        'ኣበይ ከተቐምጦ ሓሲብካ?',
      ],
      streamPhrases: [
        'ሕጂስ መሪሩኒ',
        'ከምልሰኒ እዩ!',
        'እንታይ እዩ ዝጨኑ?',
        'ናይ ሎሚ እኳ ዱባ ይመስል',
        'ዋይ ኣለኹምዶ!',
      ],
      whoWeAre: {
        kicker: '01 · ንሕና መን ኢና',
        heading: 'ጽሩይን ስሉጥን ስርዓተ ጽሬት',
        body: 'Zblal ንገዛውቲ፣ ህንጻታትን ትካላት ንግድን ጽሩይን ዝሰርሕን ስርዓተ ምጽራይ ክህልዎም ዝሕግዝ ኣገልግሎት ምጽራይ ሴፕቲክ ታንክ እዩ።',
      },
      whatWeDo: {
        kicker: '02 · እንታይ ንሰርሕ',
        heading: 'ዝተወደበ ምጽራይ ሴፕቲክ ታንክ',
        body: 'Zblal ናይ ሴፕቲክ ታንክ ምምጣጥን ጎሓፍ ምውጋድን ኣገልግሎት ብምሃብ፡ ዓማዊል ዝመልኡ ሴፕቲክ ታንክታት ብዝተወደበ መስርሕ ክጽረዩ ይሕግዝ።',
      },
      howItWorks: {
        kicker: '03 · ኣገልግሎትና ከመይ ይሰርሕ',
        heading: 'ሓሙሽተ ቀለልቲ ስጉምትታት',
        steps: [
          'ዓማዊል ስሞምን ቁጽሪ ስልኮምን የእትዉ።',
          'ዓማዊል ክፍለ ከተማኦምን ፍሉይ ቦታኦምን ይመርጹ።',
          'ዓማዊል ስሩዕ፣ ፕሪምየም ወይ ብጣዕሚ ቅልጡፍ ይመርጹ።',
          'Zblal ምዝገባኦም ይቕበል።',
          'እቲ ኣገልግሎት ብዝተመርጸ ቅድሚትን ዝተረጋገጸ ተራን ይዳሎ።',
        ],
      },
      priorities: {
        kicker: '04 · ቅድሚታት ኣገልግሎትና',
        heading: 'ቅልጣፈኹም ምረጹ',
      },
      finale: {
        messyText: 'ኣብዚ ቁሩብ ተበላሽዩ ኣሎ።',
        flushingText: 'መስመር የጽሪ ኣሎ...',
        fixItButton: 'ኣዐርዮ!',
        cleaningButton: 'የጽሪ ኣሎ...',
        happyBubble: 'ኣገላጊልካኒ!',
        solvedHeading: 'ጸገም ተፈቲሑ። ኩሉ ነገር ጽቡቕ ይስምዕ ኣሎ።',
        registerNowButton: 'ሕጂ ተመዝገብ',
        replayButton: 'ደጊምካ ርአ',
      },
    },
  },
};

export function formatLocalizedTierPrice(
  lang: LanguageCode,
  code: ServicePriorityCode,
  priceEtb: number | null,
  fallback: string
): string {
  const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.AM;
  return dict.tiers[code].formatPrice(priceEtb, fallback);
}
