import React from 'react';

// Comprehensive dictionary for scientific, academic, medical, and general option terms
export const optionDictionary: Record<string, string> = {
  // Cell biology & Organelles
  'nucleus': 'உட்கரு',
  'golgi apparatus': 'கோல்கி உறுப்பு',
  'mitochondria': 'மைட்டோகாண்ட்ரியா',
  'mitochondrion': 'மைட்டோகாண்ட்ரியா',
  'ribosome': 'ரைபோசோம்',
  'ribosomes': 'ரைபோசோம்கள்',
  'chloroplast': 'பசுங்கணிகம்',
  'chloroplasts': 'பசுங்கணிகங்கள்',
  'endoplasmic reticulum': 'எண்டோபிளாச வலை',
  'rough endoplasmic reticulum': 'சொரசொரப்பான எண்டோபிளாச வலை',
  'smooth endoplasmic reticulum': 'வழுவழுப்பான எண்டோபிளாச வலை',
  'cell wall': 'செல் சுவர்',
  'cell membrane': 'செல் சவ்வு',
  'plasma membrane': 'பிளாஸ்மா சவ்வு',
  'cytoplasm': 'சைட்டோபிளாசம்',
  'vacuole': 'நுண்குமிழி',
  'vacuoles': 'நுண்குமிழிகள்',
  'lysosome': 'லைசோசோம்',
  'lysosomes': 'லைசோசோம்கள்',
  'centrosome': 'சென்ட்ரோசோம்',
  'centriole': 'சென்ட்ரியோல்',
  'peroxisome': 'பெராக்ஸிசோம்',

  // States of Matter & Chemistry
  'solid': 'திண்மம்',
  'solids': 'திண்மங்கள்',
  'liquid': 'திரவம்',
  'liquids': 'திரவங்கள்',
  'gas': 'வாயு',
  'gases': 'வாயுக்கள்',
  'plasma': 'பிளாஸ்மா',
  'proton': 'புரோட்டான்',
  'protons': 'புரோட்டான்கள்',
  'neutron': 'நியூட்ரான்',
  'neutrons': 'நியூட்ரான்கள்',
  'electron': 'எலக்ட்ரான்',
  'electrons': 'எலக்ட்ரான்கள்',
  'atom': 'அணு',
  'atoms': 'அணுக்கள்',
  'molecule': 'மூலக்கூறு',
  'molecules': 'மூலக்கூறுகள்',
  'element': 'தனிமம்',
  'elements': 'தனிமங்கள்',
  'compound': 'சேர்மம்',
  'compounds': 'சேர்மங்கள்',
  'mixture': 'கலவை',
  'acid': 'அமிலம்',
  'base': 'காரம்',
  'salt': 'உப்பு',
  'metal': 'உலோகம்',
  'metals': 'உலோகங்கள்',
  'non-metal': 'அலோகம்',
  'non-metals': 'அலோகங்கள்',

  // Historical Personalities & Empires
  'samudragupta': 'சமுத்திரகுப்தர்',
  'chandragupta maurya': 'சந்திரகுப்த மௌரியர்',
  'chandragupta i': 'முதலாம் சந்திரகுப்தர்',
  'chandragupta ii': 'இரண்டாம் சந்திரகுப்தர்',
  'ashoka': 'அசோகர்',
  'harsha': 'ஹர்ஷர்',
  'harshavardhana': 'ஹர்ஷவர்த்தனர்',
  'kanishka': 'கனிஷ்கர்',
  'bindusara': 'பிந்துசாரர்',
  'bimbisara': 'பிம்பிசாரர்',
  'ajatashatru': 'அஜாதசத்ரு',
  'akbar': 'அக்பர்',
  'babur': 'பாபர்',
  'shah jahan': 'ஷாஜகான்',
  'aurangzeb': 'ஔரங்கசீப்',
  'jahangir': 'ஜஹாங்கீர்',
  'humayun': 'ஹுமாயூன்',
  'rajaraja chola': 'ராஜராஜ சோழன்',
  'rajendra chola': 'ராஜேந்திர சோழன்',
  'karikala chola': 'கரிகால சோழன்',
  'pandya': 'பாண்டியர்',
  'pandyas': 'பாண்டியர்கள்',
  'chera': 'சேரர்',
  'cheras': 'சேரர்கள்',
  'chola': 'சோழர்',
  'cholas': 'சோழர்கள்',
  'pallava': 'பல்லவர்',
  'pallavas': 'பல்லவர்கள்',

  // Biological Nutrition & Human Anatomy
  'carbohydrates': 'கார்போஹைட்ரேட்டுகள்',
  'carbohydrate': 'கார்போஹைட்ரேட்',
  'protein': 'புரதம்',
  'proteins': 'புரதங்கள்',
  'fat': 'கொழுப்பு',
  'fats': 'கொழுப்புகள்',
  'lipid': 'லிப்பிட்',
  'lipids': 'லிப்பிடுகள்',
  'vitamin': 'வைட்டமின்',
  'vitamins': 'வைட்டமின்கள்',
  'mineral': 'தாது',
  'minerals': 'தாதுக்கள்',
  'water': 'நீர்',
  'roughage': 'நார்ச்சத்து',
  'calcium': 'கால்சியம்',
  'iron': 'இரும்புச்சத்து',
  'iodine': 'அயோடின்',
  'sodium': 'சோடியம்',
  'potassium': 'பொட்டாசியம்',
  'anemia': 'இரத்த சோகை',
  'goitre': 'முன் கழுத்துக்கழலை',
  'scurvy': 'ஸ்கர்வி',
  'rickets': 'ரிக்கெட்ஸ்',
  'beriberi': 'பெரிபெரி',
  'heart': 'இதயம்',
  'lungs': 'நுரையீரல்',
  'kidney': 'சிறுநீரகம்',
  'kidneys': 'சிறுநீரகங்கள்',
  'brain': 'மூளை',
  'liver': 'ஈரல்',
  'stomach': 'வயிறு',
  'blood': 'இரத்தம்',
  'artery': 'தமனி',
  'vein': 'சிரை',
  'capillary': 'நுண்குழாய்',
  'dna': 'டி.என்.ஏ (DNA)',
  'rna': 'ஆர்.என்.ஏ (RNA)',
  'gene': 'மரபணு',
  'genes': 'மரபணுக்கள்',
  'chromosome': 'குரோமோசோம்',
  'chromosomes': 'குரோமோசோம்கள்',

  // Physical changes & Physics concepts
  'melting': 'உருகுதல்',
  'boiling': 'கொதித்தல்',
  'freezing': 'உறைதல்',
  'evaporation': 'ஆவியாதல்',
  'condensation': 'சுருங்குதல் / ஒடுக்கம்',
  'sublimation': 'பதங்கமாதல்',
  'burning': 'எரிதல்',
  'crushing': 'உடைத்தல்',
  'cutting': 'வெட்டுதல்',
  'physical change': 'இயற்பியல் மாற்றம்',
  'chemical change': 'வேதியியல் மாற்றம்',
  'inertia': 'நிலைமம்',
  'force': 'விசை',
  'work': 'வேலை',
  'energy': 'ஆற்றல்',
  'kinetic energy': 'இயக்க ஆற்றல்',
  'potential energy': 'நிலை ஆற்றல்',
  'power': 'திறன்',
  'speed': 'வேகம்',
  'velocity': 'திசைவேகம்',
  'acceleration': 'முடுக்கம்',
  'gravity': 'ஈர்ப்பு விசை',
  'friction': 'உராய்வு',
  'mass': 'நிறை',
  'weight': 'எடை',
  'current': 'மின்னோட்டம்',
  'electric current': 'மின்னோட்டம்',
  'voltage': 'மின்னழுத்தம்',
  'resistance': 'மின்தடை',
  'temperature': 'வெப்பநிலை',
  'heat': 'வெப்பம்',
  'light': 'ஒளி',
  'sound': 'ஒலி',
  'reflection': 'எதிரொளிப்பு',
  'refraction': 'ஒளிவிலகல்',
  'dispersion': 'நிறப்பிரிகை',
  'convex lens': 'குவி லென்ஸ்',
  'concave lens': 'குழி லென்ஸ்',
  'plane mirror': 'சமதள ஆடி',
  'ampere': 'ஆம்பியர் (A)',
  'volt': 'வோல்ட் (V)',
  'ohm': 'ஓம் (Ω)',
  'watt': 'வாட் (W)',
  'joule': 'ஜூல் (J)',
  'coulomb': 'கூலும் (C)',

  // Civics, Geography & Polity
  'lok sabha': 'மக்களவை (லோக் சபா)',
  'rajya sabha': 'மாநிலங்களவை (ராஜ்ய சபா)',
  'supreme court': 'உச்ச நீதிமன்றம்',
  'high court': 'உயர் நீதிமன்றம்',
  'president': 'குடியரசுத் தலைவர்',
  'prime minister': 'பிரதமர்',
  'governor': 'ஆளுநர்',
  'chief minister': 'முதலமைச்சர்',
  'gram panchayat': 'கிராம ஊராட்சி',
  'panchayat samiti': 'ஊராட்சி ஒன்றியம்',
  'zila parishad': 'மாவட்ட ஊராட்சி',
  'united nations': 'ஐக்கிய நாடுகள் சபை',
  'security council': 'பாதுகாப்பு பேரவை',
  'general assembly': 'பொதுச் சபை',
  'taj mahal': 'தாஜ்மஹால்',
  'red fort': 'செங்கோட்டை',
  'qutub minar': 'குதுப் மினார்',
  'brihadeshwara temple': 'பிரகதீஸ்வரர் கோவில்',
  'konark temple': 'கோனார்க் சூரியன் கோவில்',
  'asia': 'ஆசியா',
  'africa': 'ஆப்பிரிக்கா',
  'europe': 'ஐரோப்பா',
  'north america': 'வட அமெரிக்கா',
  'south america': 'தென் அமெரிக்கா',
  'antarctica': 'அண்டார்டிகா',
  'australia': 'ஆஸ்திரேலியா',
  'gdp': 'மொத்த உள்நாட்டு உற்பத்தி (GDP)',
  'gnp': 'மொத்த தேசிய உற்பத்தி (GNP)',
  'ndp': 'நிகர உள்நாட்டு உற்பத்தி (NDP)'
};

// Explanations Dictionary (25 Conceptual Bases)
export const explanationDictionary: Record<string, string> = {
  'Chandragupta Maurya founded Mauryan Empire ~321 BCE. Defeated Nanda Dynasty and Seleucus I. Grandfather of Ashoka. Capital: Pataliputra (Patna).':
    'சந்திரகுப்த மௌரியர் கி.மு. ~321 இல் மௌரியப் பேரரசை நிறுவினார். நந்த வம்சம் மற்றும் செலுக்கஸ் I ஆகியோரைத் தோற்கடித்தார். அசோகரின் பாட்டனார். தலைநகரம்: பாடலிபுத்திரம் (பாட்னா).',

  'Shah Jahan (r. 1628-1658) built Taj Mahal (1632-1653) as mausoleum for wife Mumtaz Mahal. White marble, Agra. UNESCO World Heritage Site.':
    'ஷாஜகான் (ஆட்சி 1628-1658) தனது மனைவி மும்தாஜ் மஹாலின் நினைவாக தாஜ்மஹாலை (1632-1653) கட்டினார். வெள்ளை பளிங்குக்கல், ஆக்ரா. யுனெஸ்கோ உலக பாரம்பரிய தளம்.',

  'India gained independence on August 15, 1947 from British rule after independence struggle. Republic Day (Jan 26, 1950) when Constitution adopted. First President: Dr. Rajendra Prasad.':
    'விடுதலைப் போராட்டத்திற்குப் பிறகு ஆகஸ்ட் 15, 1947 அன்று பிரிட்டிஷ் ஆட்சியிடமிருந்து இந்தியா சுதந்திரம் பெற்றது. அரசியலமைப்பு ஏற்றுக்கொள்ளப்பட்ட நாள் குடியரசு தினம் (ஜனவரி 26, 1950). முதல் குடியரசுத் தலைவர்: டாக்டர் ராஜேந்திர பிரசாத்.',

  'Chola Empire (9th-13th century) known for Dravidian art, bronze sculpture, temple architecture. Brihadeshwara Temple (Tanjore) is masterpiece. Maritime traders. Tamil language flourished.':
    'சோழப் பேரரசு (9-13 ஆம் நூற்றாண்டு) திராவிடக் கலை, வெண்கலச் சிற்பங்கள், கோவில் கட்டிடக்கலைக்கு பெயர் பெற்றது. பிரகதீஸ்வரர் கோவில் (தஞ்சாவூர்) ஒரு தலைசிறந்த படைப்பு. கடல்வழி வர்த்தகர்கள். தமிழ் மொழி செழித்தோங்கியது.',

  'Asia covers 44.5 million km² - largest continent. 60% of world population. Contains 48 countries including China, India, Russia. Extends from Arctic to Equator.':
    'ஆசியா 44.5 மில்லியன் கி.மீ² பரப்பளவைக் கொண்டுள்ளது - மிகப்பெரிய கண்டம். உலக மக்கள் தொகையில் 60%. சீனா, இந்தியா, ரஷ்யா உள்ளிட்ட 48 நாடுகளைக் கொண்டுள்ளது. ஆர்க்டிக் முதல் பூமத்திய ரேகை வரை பரவியுள்ளது.',

  "GDP = total monetary value of all finished goods and services in country annually. Key economic indicator of country's production and prosperity.":
    'GDP (மொத்த உள்நாட்டு உற்பத்தி) = ஒரு நாட்டில் ஆண்டுதோறும் உற்பத்தி செய்யப்படும் அனைத்து முடிக்கப்பட்ட பொருட்கள் மற்றும் சேவைகளின் மொத்த பண மதிப்பு. நாட்டின் உற்பத்தி மற்றும் செழிப்பின் முக்கிய பொருளாதாரக் குறியீடு.',

  'Indian Constitution adopted January 26, 1950 (Republic Day). Largest written constitution (470 articles, 12 schedules). Dr. B.R. Ambedkar chaired drafting committee.':
    'இந்திய அரசியலமைப்பு ஜனவரி 26, 1950 அன்று ஏற்றுக்கொள்ளப்பட்டது (குடியரசு தினம்). உலகின் மிக நீளமான எழுதப்பட்ட அரசியலமைப்பு (470 பிரிவுகள், 12 அட்டவணைகள்). வரைவுக் குழுவின் தலைவர் டாக்டர் பி.ஆர். அம்பேத்கர்.',

  'Prime Minister heads executive branch and government. Elected from ruling party in Lok Sabha. Leads Council of Ministers. First PM: Jawaharlal Nehru (1947-1964).':
    'பிரதமர் நிர்வாகப் பிரிவையும் அரசாங்கத்தையும் வழிநடத்துகிறார். மக்களவையின் ஆளும் கட்சியிலிருந்து தேர்ந்தெடுக்கப்படுகிறார். அமைச்சரவையை வழிநடத்துகிறார். முதல் பிரதமர்: ஜவஹர்லால் நேரு (1947-1964).',

  'Article 14: Right to Equality before law. Article 19: Freedom of expression/assembly. Article 21: Right to life and personal liberty. Article 25-28: Religious freedom.':
    'பிரிவு 14: சட்டத்தின் முன் சமத்துவ உரிமை. பிரிவு 19: பேச்சு/கருத்து சுதந்திரம். பிரிவு 21: வாழ்வுரிமை மற்றும் தனிநபர் சுதந்திரம். பிரிவு 25-28: மத சுதந்திரம்.',

  'Panchayat Raj operates at village (Gram Panchayat), block, and district levels. 73rd Amendment (1992) strengthened local self-government. Gram Panchayat has 5-15 members.':
    'பஞ்சாயத்து ராஜ் கிராமம் (கிராம ஊராட்சி), வட்டாரம் மற்றும் மாவட்ட அளவுகளில் இயங்குகிறது. 73வது திருத்தம் (1992) உள்ளாட்சி அமைப்புகளை வலுப்படுத்தியது. கிராம ஊராட்சியில் 5-15 உறுப்பினர்கள் உள்ளனர்.',

  'United Nations founded June 26, 1945 in San Francisco. 51 founding members. Aim: maintain international peace and security. Headquarters: New York.':
    'ஐக்கிய நாடுகள் சபை ஜூன் 26, 1945 அன்று சான் பிரான்சிஸ்கோவில் நிறுவப்பட்டது. 51 நிறுவன உறுப்பினர்கள். நோக்கம்: சர்வதேச அமைதி மற்றும் பாதுகாப்பைப் பராமரித்தல். தலைமையகம்: நியூயார்க்.',

  'Both Taj Mahal and Red Fort are UNESCO World Heritage Sites. India has 42 World Heritage Sites (as of 2023). Also includes Konark Temple, Jaipur City, Santiniketan.':
    'தாஜ்மஹால் மற்றும் செங்கோட்டை இரண்டும் யுனெஸ்கோ உலக பாரம்பரிய தளங்கள். இந்தியாவில் 42 உலக பாரம்பரிய தளங்கள் உள்ளன (2023 நிலவரப்படி). இதில் கோனார்க் கோவில், ஜெய்ப்பூர் நகரம், சாந்திநிகேதன் ஆகியவையும் அடங்கும்.',

  'Solids have fixed shape and fixed volume due to strong intermolecular forces. Liquids have fixed volume but take container shape. Gases have neither.':
    'வலிமையான மூலக்கூறிடை விசைகள் காரணமாக திண்மங்கள் நிலையான வடிவத்தையும் கனவளவையும் கொண்டுள்ளன. திரவங்கள் நிலையான கனவளவைக் கொண்டுள்ளன ஆனால் கொள்கலனின் வடிவத்தை ஏற்கின்றன. வாயுக்களுக்கு இரண்டும் இல்லை.',

  'The nucleus is the dense central part containing protons (positive charge) and neutrons (no charge). Electrons orbit around it in shells.':
    'உட்கரு என்பது புரோட்டான்கள் (நேர்மின் சுமை) மற்றும் நியூட்ரான்களை (சுமையற்றவை) கொண்ட அடர்த்தியான மையப் பகுதியாகும். எலக்ட்ரான்கள் கூடுகளில் அதைச் சுற்றி வருகின்றன.',

  "Melting is physical change - ice becomes water but remains H₂O. Shape/state changes but substance identity unchanged. Burning creates new substances (ash, CO₂), so it's chemical.":
    'உருகுதல் என்பது ஒரு இயற்பியல் மாற்றம் - பனி நீராக மாறினாலும் H₂O ஆகவே உள்ளது. வடிவம்/நிலை மாறினாலும் பொருளின் தன்மை மாறுவதில்லை. எரிதல் புதிய பொருட்களை (சாம்பல், CO₂) உருவாக்குகிறது, எனவே இது வேதியியல் மாற்றம்.',

  'Burning creates new substances (ash, CO₂, H₂O) with completely different properties. Cannot be reversed. Crushing, boiling, cutting are physical - original substance unchanged.':
    'எரிதல் முற்றிலும் மாறுபட்ட பண்புகளுடன் புதிய பொருட்களை (சாம்பல், CO₂, H₂O) உருவாக்குகிறது. இதை மாற்றியமைக்க முடியாது. உடைத்தல், கொதிக்க வைத்தல், வெட்டுதல் ஆகியவை இயற்பியல் மாற்றங்கள் - அசல் பொருள் மாறாது.',

  "Newton's First Law (Inertia): Objects resist changes in motion. Stationary objects stay stationary and moving objects maintain constant velocity without net force.":
    'நியூட்டனின் முதல் விதி (நிலைமம்): பொருள்கள் இயக்கத்தின் மாற்றங்களை எதிர்க்கின்றன. புறவிசை செயல்படாத வரை ஓய்விலுள்ள பொருள் ஓய்விலும், இயங்கும் பொருள் அதே திசைவேகத்திலும் தொடரும்.',

  'Work = F × d × cos(θ). When force and displacement are in same direction, W = F × d (Joules). If perpendicular, work = 0.':
    'வேலை (Work) = F × d × cos(θ). விசையும் இடப்பெயர்ச்சியும் ஒரே திசையில் இருக்கும்போது, W = F × d (ஜூல்). செங்குத்தாக இருந்தால், வேலை = 0.',

  'Light travels fastest in vacuum (3×10⁸ m/s). Speed reduces in denser media: water (~2.25×10⁸ m/s), glass (~2×10⁸ m/s). This causes refraction.':
    'ஒளி வெற்றிடத்தில் மிக வேகமாகப் பயணிக்கிறது (3×10⁸ மீ/வி). அடர்த்தியான ஊடகங்களில் வேகம் குறைகிறது: நீர் (~2.25×10⁸ மீ/வி), கண்ணாடி (~2×10⁸ மீ/வி). இது ஒளிவிலகலை ஏற்படுத்துகிறது.',

  'Sound requires a medium (air, water, metal) of particles to vibrate and transmit waves. Vacuum has no particles, so sound is impossible there.':
    'ஒலி அலைகளை அதிர்வு செய்து கடத்த துகள்கள் கொண்ட ஒரு ஊடகம் (காற்று, நீர், உலோகம்) தேவைப்படுகிறது. வெற்றிடத்தில் துகள்கள் இல்லாததால், அங்கு ஒலி பரவ முடியாது.',

  'Current (Ampere) = Coulombs per second (1 A = 1 C/s). Volt measures potential difference. Ohm measures resistance. Watt measures power.':
    'மின்னோட்டம் (ஆம்பியர்) = வினாடிக்கு கூலும் (1 A = 1 C/s). வோல்ட் மின்னழுத்த வேறுபாட்டை அளவிடுகிறது. ஓம் மின்தடையை அளவிடுகிறது. வாட் மின்திறனை அளவிடுகிறது.',

  'Temperature ∝ average kinetic energy of particles. Higher temp = faster particle motion. Heat flows from hot to cold objects until thermal equilibrium.':
    'வெப்பநிலை ∝ துகள்களின் சராசரி இயக்க ஆற்றல். அதிக வெப்பநிலை = வேகமான துகள் இயக்கம். வெப்பச் சமநிலை அடையும் வரை வெப்பம் சூடான பொருளிலிருந்து குளிர்ந்த பொருளுக்குப் பாய்கிறது.',

  "Earth's magnetic field is generated by convection of liquid iron and nickel in the outer core. This creates magnetic poles near geographic poles.":
    'பூமியின் காந்தப்புலம் வெளிப்புறக் கருவில் உள்ள திரவ இரும்பு மற்றும் நிக்கலின் வெப்பச்சலனத்தால் உருவாகிறது. இது புவியியல் துருவங்களுக்கு அருகில் காந்தத் துருவங்களை உருவாக்குகிறது.',

  'Mitochondria produces ATP (energy) through aerobic respiration. Contains own DNA. Ribosomes synthesize proteins. Golgi processes proteins. Nucleus stores genetic material.':
    'மைட்டோகாண்ட்ரியா காற்று சுவாசத்தின் மூலம் ATP (ஆற்றல்) உற்பத்தி செய்கிறது. சொந்த DNA கொண்டுள்ளது. ரைபோசோம்கள் புரதங்களை உருவாக்குகின்றன. கோல்கி உடலம் புரதங்களை செயலாக்குகிறது. உட்கரு மரபணுப் பொருளை சேமிக்கிறது.',

  'Carbohydrates (glucose) provide quick energy (4 kcal/g). Proteins build muscles (4 kcal/g). Fats store energy long-term (9 kcal/g). Vitamins regulate metabolism. Minerals strengthen bones.':
    'கார்போஹைட்ரேட்டுகள் (குளுக்கோஸ்) உடனடி ஆற்றலை வழங்குகின்றன (4 kcal/g). புரதங்கள் தசைகளை உருவாக்குகின்றன (4 kcal/g). கொழுப்புகள் நீண்ட கால ஆற்றலைச் சேமிக்கின்றன (9 kcal/g). வைட்டமின்கள் வளர்சிதை மாற்றத்தை ஒழுங்குபடுத்துகின்றன. தாதுக்கள் எலும்புகளை வலுப்படுத்துகின்றன.'
};

/**
 * Returns Tamil translation for an option text.
 */
export function getTamilOption(text?: string | null): string {
  if (!text) return '';
  const trimmed = text.trim();
  // If it already has Tamil script, return it
  if (/[\u0B80-\u0BFF]/.test(trimmed)) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  return optionDictionary[lower] || '';
}

/**
 * Returns English / Tamil option pair for bilingual rendering.
 */
export function getBilingualOption(enText?: string | null, taText?: string | null): {
  en: string;
  ta: string;
  hasBoth: boolean;
} {
  const en = (enText || '').trim();
  let ta = (taText || '').trim();

  // If en already contains a slash with Tamil, return as is
  if (en.includes('/') && /[\u0B80-\u0BFF]/.test(en)) {
    const parts = en.split('/');
    return {
      en: parts[0].trim(),
      ta: parts.slice(1).join('/').trim(),
      hasBoth: true
    };
  }

  // If ta has Tamil, use it
  if (ta && /[\u0B80-\u0BFF]/.test(ta)) {
    return { en, ta, hasBoth: Boolean(en && ta) };
  }

  // Look up en in dictionary
  const dictTa = getTamilOption(en);
  if (dictTa) {
    return { en, ta: dictTa, hasBoth: Boolean(en && dictTa) };
  }

  // If ta is present and different from en
  if (ta && ta.toLowerCase() !== en.toLowerCase()) {
    const dictFromTa = getTamilOption(ta);
    if (dictFromTa) {
      return { en, ta: dictFromTa, hasBoth: true };
    }
  }

  return { en, ta: '', hasBoth: false };
}

/**
 * Returns Tamil translation for a question explanation.
 */
export function getTamilExplanation(exp?: string | null, expTa?: string | null): string {
  if (expTa && /[\u0B80-\u0BFF]/.test(expTa.trim())) {
    return expTa.trim();
  }
  if (!exp) return '';

  const trimmed = exp.trim();
  const varMatch = trimmed.match(/\s*\((?:Variation|Version)\s*(\d+)\)\s*$/i);
  const base = trimmed.replace(/\s*\((?:Variation|Version)\s*\d+\)\s*$/i, '').trim();

  let trans = explanationDictionary[base];
  if (!trans) {
    // Check math formula patterns
    const spMatch = trimmed.match(/^SP\s*=\s*(\d+)\s*\+\s*(\d+)%\s*profit\s*=\s*(\d+)$/i);
    if (spMatch) {
      return `விற்பனை விலை (SP) = ${spMatch[1]} + ${spMatch[2]}% லாபம் = ${spMatch[3]}`;
    }
    const siMatch = trimmed.match(/^SI\s*=\s*\((\d+)[×x](\d+)[×x](\d+)\)\/100\s*=\s*(\d+)$/i);
    if (siMatch) {
      return `தனிவட்டி (SI) = (${siMatch[1]}×${siMatch[2]}×${siMatch[3]})/100 = ${siMatch[4]}`;
    }
    const speedMatch = trimmed.match(/^Speed\s*=\s*(\d+)\/(\d+)\s*=\s*(\d+)\s*km\/h$/i);
    if (speedMatch) {
      return `வேகம் (Speed) = ${speedMatch[1]}/${speedMatch[2]} = ${speedMatch[3]} கி.மீ/மணி`;
    }
    const areaMatch = trimmed.match(/^Area\s*=\s*(\d+)\s*[×x]\s*(\d+)\s*=\s*(\d+)$/i);
    if (areaMatch) {
      return `பரப்பளவு (Area) = ${areaMatch[1]} × ${areaMatch[2]} = ${areaMatch[3]}`;
    }
    const meanMatch = trimmed.match(/^Mean\s*=\s*(\d+)\/(\d+)\s*=\s*(\d+)$/i);
    if (meanMatch) {
      return `கூட்டுச் சராசரி (Mean) = ${meanMatch[1]}/${meanMatch[2]} = ${meanMatch[3]}`;
    }
    const probMatch = trimmed.match(/^P\(E\)\s*=\s*(\d+\/\d+)$/i);
    if (probMatch) {
      return `நிகழ்தகவு P(E) = ${probMatch[1]}`;
    }
    return '';
  }

  if (varMatch) {
    return `${trans} (மாறுபாடு ${varMatch[1]})`;
  }
  return trans;
}
