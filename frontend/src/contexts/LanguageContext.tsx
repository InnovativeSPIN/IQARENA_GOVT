import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export type Language = 'ta' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
}

// ============================================================================
// Master UI Translation Dictionaries: English -> Tamil (enToTaMap)
// ============================================================================
export const enToTaMap: Record<string, string> = {
  // Navigation & General Portal
  'Dashboard': 'முகப்பு',
  'User Management': 'பயனர் மேலாண்மை',
  'School Management': 'பள்ளி மேலாண்மை',
  'Exam Management': 'தேர்வு வகை மேலாண்மை',
  'Subject Management': 'பாட மேலாண்மை',
  'Topic Management': 'தலைப்பு மேலாண்மை',
  'Question Bank': 'வினா வங்கி',
  'Question Management': 'வினா மேலாண்மை',
  'Test Management': 'தேர்வு மேலாண்மை',
  'Reports': 'அறிக்கைகள்',
  'Messages': 'செய்திகள்',
  'Notification Logs': 'அறிவிப்புப் பதிவுகள்',
  'Logout': 'வெளியேறு',
  'Home': 'முகப்பு',
  'Students': 'மாணவர்கள்',
  'Faculty': 'ஆசிரியர்கள்',
  'Teachers': 'ஆசிரியர்கள்',
  'Schools': 'பள்ளிகள்',
  'Test Reports': 'தேர்வு அறிக்கைகள்',
  'Notifications': 'அறிவிப்புகள்',
  'Profile': 'சுயவிவரம்',
  'Settings': 'அமைப்புகள்',
  'Help': 'உதவி',
  'Tests': 'தேர்வுகள்',
  'Results': 'முடிவுகள்',
  'Faculty Portal': 'ஆசிரியர் தளம்',
  'School Portal': 'பள்ளி தளம்',
  'Student Portal': 'மாணவர் தளம்',
  'Admin Portal': 'நிர்வாக தளம்',
  'My Account': 'என் கணக்கு',
  'Overview': 'கண்ணோட்டம்',
  'Performance': 'செயல்திறன்',

  // Login & Authentication
  'A Product of NSCET': 'NSCET-ன் தயாரிப்பு',
  'Welcome Back': 'மீண்டும் வருக',
  'Welcome back!': 'மீண்டும் வருக!',
  'Sign In': 'உள்நுழைக',
  'Sign Up': 'பதிவு செய்க',
  'Login': 'உள்நுழைக',
  'Register': 'பதிவு செய்க',
  'User ID / Email': 'பயனர் ஐடி / மின்னஞ்சல்',
  'Enter your User ID or Email': 'பயனர் ஐடி அல்லது மின்னஞ்சலை உள்ளிடவும்',
  'Enter your User ID and 6-digit PIN': 'பயனர் ஐடி மற்றும் 6 இலக்க பின்னை உள்ளிடவும்',
  'User ID (EMIS / Roll No / Phone)': 'பயனர் ஐடி (EMIS / எண் / தொலைபேசி)',
  '6-Digit Security PIN': '6 இலக்கப் பாதுகாப்பு பின்',
  '6-Digit PIN': '6 இலக்க பின்',
  'Current PIN': 'தற்போதைய பின்',
  'New PIN': 'புதிய பின்',
  'Confirm PIN': 'பின்னை உறுதிப்படுத்துக',
  'Logging In...': 'உள்நுழைகிறது...',
  "Don't have an account?": 'கணக்கு இல்லையா?',
  "Don't have an account? Sign Up": 'கணக்கு இல்லையா? பதிவு செய்க',
  'Already have an account?': 'ஏற்கனவே கணக்கு உள்ளதா?',
  'Already have an account? Sign In': 'ஏற்கனவே கணக்கு உள்ளதா? உள்நுழைக',
  'Reset Password': 'கடவுச்சொல்லை மாற்றுக',
  'Reset PIN': 'பின்னை மாற்றுக',
  'Generate PIN': 'புதிய பின் உருவாக்குக',
  'Current Password': 'தற்போதைய கடவுச்சொல்',
  'New Password': 'புதிய கடவுச்சொல்',
  'Confirm Password': 'கடவுச்சொல்லை உறுதிப்படுத்துக',
  'Enter your current password and new 6-digit password': 'தற்போதைய கடவுச்சொல் மற்றும் புதிய 6 இலக்க பின்னை உள்ளிடவும்',
  'Online Exam & Assessment Management Portal': 'இணைய வழி தேர்வு மற்றும் மதிப்பீட்டு மேலாண்மை தளம்',

  // Modals & Action Dialogs (From Screenshots & General Admin/Faculty)
  'Add New Subject': 'புதிய பாடம் சேர்க்க',
  'Create a new subject and link it to an exam': 'புதிய பாடத்தை உருவாக்கி ஒரு தேர்வுடன் இணைக்கவும்',
  'Subject Name': 'பாடத்தின் பெயர்',
  'e.g., Physics': 'எ.கா: இயற்பியல்',
  'Exam Type': 'தேர்வு வகை',
  'Manage Exams': 'தேர்வுகளை நிர்வகிக்க',
  'Add / Manage Exams': 'தேர்வுகளைச் சேர்க்க / நிர்வகிக்க',
  'Add New Question': 'புதிய வினா சேர்க்க',
  'Create a new MCQ question': 'புதிய பலவுள் தெரிவு வினாவை உருவாக்கவும்',
  'Attach Images': 'படங்களை இணைக்க',
  'Attach Image': 'படம் இணைக்க',
  'No subtopics': 'துணைத் தலைப்புகள் இல்லை',
  'Create New Test': 'புதிய தேர்வு உருவாக்க',
  'Fill in the test details below': 'தேர்வு விவரங்களை கீழே நிரப்பவும்',
  'Single Subject Test': 'ஒற்றைப் பாடத் தேர்வு',
  'Multi-Topic Test': 'பல தலைப்புத் தேர்வு',
  'Basic Information': 'அடிப்படை விவரங்கள்',
  'Test Title': 'தேர்வின் தலைப்பு',
  'e.g., NEET Physics Mock Test - Chapter 1': 'எ.கா: மாதிரி தேர்வு - பாடம் 1',
  'Select exam type': 'தேர்வு வகையைத் தேர்ந்தெடுக்கவும்',
  'Assigned Schools': 'ஒதுக்கப்பட்ட பள்ளிகள்',
  'Select the schools that take this test': 'இத்தேர்வை எழுதும் பள்ளிகளைத் தேர்ந்தெடுக்கவும்',
  'Select all': 'அனைத்தையும் தேர்ந்தெடுக்க',
  'Select at least one school to see its classes.': 'வகுப்புகளைக் காண குறைந்தபட்சம் ஒரு பள்ளியைத் தேர்ந்தெடுக்கவும்.',
  'Content Selection': 'பாடப்பிரிவு தேர்வு',
  'Select exam first': 'முதலில் தேர்வைத் தேர்ந்தெடுக்கவும்',
  'Topics': 'தலைப்புகள்',
  'All Topics': 'அனைத்துத் தலைப்புகள்',
  'Subtopics': 'துணைத் தலைப்புகள்',
  'All Subtopics': 'அனைத்துத் துணைத் தலைப்புகள்',
  'Test Configuration': 'தேர்வு கட்டமைப்பு',
  'Automatic (Random)': 'தானியங்கி (சீரற்ற முறை)',
  'Manual Selection': 'கைமுறை தேர்வு',

  // Reports View (Screenshot 4)
  'Test results by school, test and class': 'பள்ளி, தேர்வு மற்றும் வகுப்பு வாரியான தேர்வு முடிவுகள்',
  'Download CSV': 'CSV பதிவிறக்குக',
  'Print / PDF': 'அச்சிடு / PDF',
  'All schools': 'அனைத்துப் பள்ளிகள்',
  'All tests (summary)': 'அனைத்துத் தேர்வுகள் (சுருக்கம்)',
  'All classes': 'அனைத்து வகுப்புகள்',
  'Test summary': 'தேர்வு சுருக்கம்',
  'Loading report...': 'அறிக்கை ஏற்றப்படுகிறது...',
  'Attempted': 'எழுதப்பட்டவை',
  'Not attempted': 'எழுதப்படாதவை',
  'Highest / Lowest': 'அதிகபட்சம் / குறைந்தபட்சம்',
  'Show:': 'காட்டுக:',
  'All students': 'அனைத்து மாணவர்கள்',

  // Messages View (Screenshot 5)
  'Send messages to school faculty and read their replies. English and தமிழ் are both supported.': 'பள்ளி ஆசிரியர்களுக்குச் செய்தி அனுப்பி அவர்களின் பதில்களைப் படிக்கவும். ஆங்கிலம் மற்றும் தமிழ் இரண்டும் ஆதரிக்கப்படுகின்றன.',
  'New message to faculty': 'ஆசிரியருக்குப் புதிய செய்தி',
  'Send to': 'பெறுநர்',
  'Faculty of all schools': 'அனைத்துப் பள்ளி ஆசிரியர்கள்',
  'Selected schools': 'தேர்ந்தெடுக்கப்பட்ட பள்ளிகள்',
  'Tick at least one school': 'குறைந்தபட்சம் ஒரு பள்ளியைத் தேர்ந்தெடுக்கவும்',
  'Subject / பொருள்': 'பொருள் / Subject',
  'Type your message in English or தமிழ்...': 'உங்கள் செய்தியை ஆங்கிலம் அல்லது தமிழில் தட்டச்சு செய்யவும்...',
  'Inbox': 'உள்வரும் பெட்டி',
  'Sent': 'அனுப்பியவை',
  'No messages from faculty yet.': 'ஆசிரியர்களிடமிருந்து இதுவரை செய்திகள் எதுவும் வரவில்லை.',
  'You have not sent any messages yet.': 'நீங்கள் இதுவரை எந்தச் செய்தியையும் அனுப்பவில்லை.',
  'Attach image proof': 'பட ஆதாரத்தை இணைக்க',
  'Change image': 'படத்தை மாற்றுக',
  'Sending...': 'அனுப்பப்படுகிறது...',
  'Message sent': 'செய்தி அனுப்பப்பட்டது',

  // Common Academic Subjects & Topics (Screenshot 2)
  'United Nations': 'ஐக்கிய நாடுகள் சபை',
  'Ancient History': 'பண்டைய வரலாறு',
  'Medieval History': 'இடைக்கால வரலாறு',
  'Tamil History': 'தமிழ் வரலாறு',
  'Geography': 'புவியியல்',
  'Economics': 'பொருளாதாரம்',
  'Civics': 'குடிமையியல்',
  'Rights & Duties': 'உரிமைகளும் கடமைகளும்',
  'Panchayat Raj': 'பஞ்சாயத்து ராஜ்',
  'Culture & Heritage': 'பண்பாடும் பாரம்பரியமும்',
  'Social Science': 'சமூக அறிவியல்',
  'Science': 'அறிவியல்',
  'Mathematics': 'கணிதம்',
  'Math': 'கணிதம்',
  'Physics': 'இயற்பியல்',
  'Chemistry': 'வேதியியல்',
  'Biology': 'உயிரியல்',
  'Botany': 'தாவரவியல்',
  'Zoology': 'விலங்கியல்',
  'English Language': 'ஆங்கிலம்',
  'English': 'ஆங்கிலம்',
  'Tamil Language': 'தமிழ்',
  'Tamil': 'தமிழ்',
  'Mental Ability': 'மனத்திறன்',
  'General': 'பொதுவானவை',
  'SAT': 'கல்வித்திறன் (SAT)',
  'MAT': 'மனத்திறன் (MAT)',

  // Common UI Buttons & Actions
  'Add Student': 'மாணவரைச் சேர்க்க',
  'Register new student': 'புதிய மாணவரைப் பதிவு செய்க',
  'Add School': 'புதிய பள்ளியைச் சேர்க்க',
  'Create Test': 'தேர்வு உருவாக்குக',
  'Setup new examination': 'புதிய தேர்வை அமைக்க',
  'Add Question': 'வினா சேர்க்க',
  'Add to question bank': 'வினா வங்கியில் சேர்க்க',
  'Add Exam': 'தேர்வு வகை சேர்க்க',
  'Create or manage exams': 'தேர்வுகளை உருவாக்க / நிர்வகிக்க',
  'Create Batch': 'பிரிவு உருவாக்குக',
  'Create a new batch': 'புதிய பிரிவை அமைக்க',
  'Add Subject': 'புதிய பாடம் சேர்க்க',
  'Add Topic': 'புதிய தலைப்பு சேர்க்க',
  'Add Subtopic': 'துணைத் தலைப்பு சேர்க்க',
  'Save': 'சேமிக்க',
  'Save Changes': 'மாற்றங்களைச் சேமிக்க',
  'Cancel': 'ரத்து செய்க',
  'Submit': 'சமர்ப்பிக்க',
  'Delete': 'நீக்குக',
  'Edit': 'திருத்துக',
  'View': 'காண்க',
  'View all': 'அனைத்தையும் காண்க',
  'View report': 'அறிக்கையைக் காண்க',
  'View Result': 'முடிவைக் காண்க',
  'View Results': 'முடிவுகளைக் காண்க',
  'Close': 'மூடுக',
  'Back': 'பின்செல்க',
  'Next': 'அடுத்து',
  'Previous': 'முந்தைய',
  'Search': 'தேடுக',
  'Filter': 'வடிகட்டுக',
  'Filter by School': 'பள்ளி வாரியாக வடிகட்டுக',
  'Filter by School:': 'பள்ளி வாரியாக வடிகட்டுக:',
  'Filter by Standard': 'வகுப்பு வாரியாக வடிகட்டுக',
  'Filter by Subject': 'பாடம் வாரியாக வடிகட்டுக',
  'Filter by Exam': 'தேர்வு வாரியாக வடிகட்டுக',
  'All Schools': 'அனைத்துப் பள்ளிகள்',
  'All Subjects': 'அனைத்துப் பாடங்கள்',
  'All Classes': 'அனைத்து வகுப்புகள்',
  'All Tests': 'அனைத்துத் தேர்வுகள்',
  'All Exams': 'அனைத்துத் தேர்வுகள்',
  'All': 'அனைத்தும்',
  'Clear': 'அழிக்க',
  'Clear Filters': 'வடிகட்டிகளை அழிக்க',
  'Clear All': 'அனைத்தையும் அழிக்க',
  'Export': 'ஏற்றுமதி செய்க',
  'Import': 'இறக்குமதி செய்க',
  'Download': 'பதிவிறக்குக',
  'Download Excel': 'Excel பதிவிறக்குக',
  'Download PDF': 'PDF பதிவிறக்குக',
  'Download Template': 'மாதிரி கோப்பைப் பதிவிறக்குக',
  'Upload CSV': 'CSV பதிவேற்றுக',
  'Upload Excel': 'Excel பதிவேற்றுக',
  'Bulk Upload': 'மொத்தமாகப் பதிவேற்றுக',
  'Bulk Upload Users': 'பயனர்களை மொத்தமாகப் பதிவேற்றுக',
  'Add User': 'பயனர் சேர்க்க',
  'Create User': 'பயனர் உருவாக்குக',
  'Publish': 'வெளியிடுக',
  'Unpublish': 'வெளியீட்டை நிறுத்துக',
  'Publish Test': 'தேர்வை வெளியிடுக',
  'Assign': 'ஒதுக்குக',
  'Assign Test': 'தேர்வை ஒதுக்குக',
  'Assign to Schools': 'பள்ளிகளுக்கு ஒதுக்குக',
  'Assign to Classes': 'வகுப்புகளுக்கு ஒதுக்குக',
  'Send': 'அனுப்புக',
  'Send Message': 'செய்தி அனுப்புக',
  'Apply': 'பயன்படுத்துக',
  'Confirm': 'உறுதிசெய்க',
  'Yes': 'ஆம்',
  'No': 'இல்லை',

  // Table Columns & Data Labels
  'User': 'பயனர்',
  'Admin': 'நிர்வாகி',
  'Student': 'மாணவர்',
  'Contact': 'தொடர்பு விவரம்',
  'Class/Exam': 'வகுப்பு / தேர்வு',
  'Name': 'பெயர்',
  'Full Name': 'முழுப் பெயர்',
  'Student Name': 'மாணவர் பெயர்',
  'Faculty Name': 'ஆசிரியர் பெயர்',
  'User ID': 'பயனர் ஐடி',
  'User ID / UDISE ID': 'பயனர் ஐடி / UDISE ஐடி',
  'EMIS': 'EMIS',
  'EMIS No': 'EMIS எண்',
  'EMIS Number': 'EMIS எண்',
  'Role': 'பங்கு',
  'Email': 'மின்னஞ்சல்',
  'Email Address': 'மின்னஞ்சல் முகவரி',
  'Email Id': 'மின்னஞ்சல் ஐடி',
  'Phone': 'தொலைபேசி எண்',
  'Phone Number': 'தொலைபேசி எண்',
  'Batch': 'தொகுதி',
  'Status': 'நிலை',
  'Active': 'செயலில் உள்ளது',
  'Inactive': 'செயலற்றது',
  'No Account': 'கணக்கு இல்லை',
  'All Status': 'அனைத்து நிலைகளும்',
  'Manage admins, faculty, and students': 'நிர்வாகிகள், ஆசிரியர்கள் மற்றும் மாணவர்களை நிர்வகிக்கவும்',
  'Search by name, email, or phone...': 'பெயர், மின்னஞ்சல் அல்லது தொலைபேசி மூலம் தேடுக...',
  'Select class': 'வகுப்பைத் தேர்ந்தெடுக்கவும்',

  // Profile & Account Settings
  'Edit Profile': 'சுயவிவரத்தைத் திருத்து',
  'Personal Information': 'தனிப்பட்ட விவரங்கள்',
  'Member Since': 'இணைந்த தேதி',
  'Allocated Subjects': 'ஒதுக்கப்பட்ட பாடங்கள்',
  'No subjects allocated yet': 'இதுவரை பாடங்கள் ஒதுக்கப்படவில்லை',
  'Security': 'பாதுகாப்பு',
  'Password': 'கடவுச்சொல்',
  'Password & Security': 'கடவுச்சொல் & பாதுகாப்பு',
  'Change Password': 'கடவுச்சொல்லை மாற்று',
  'Last changed 30 days ago': '30 நாட்களுக்கு முன்பு மாற்றப்பட்டது',
  'Manage your account settings': 'உங்கள் கணக்கு அமைப்புகளை நிர்வகிக்கவும்',
  'Current Password (6 digits)': 'தற்போதைய கடவுச்சொல் (6 இலக்கங்கள்)',
  'Confirm New Password': 'புதிய கடவுச்சொல்லை உறுதிப்படுத்துக',
  'Enter current password': 'தற்போதைய கடவுச்சொல்லை உள்ளிடவும்',
  'Enter new password': 'புதிய கடவுச்சொல்லை உள்ளிடவும்',
  'Confirm new password': 'புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்',
  'Please fill all password fields': 'அனைத்து கடவுச்சொல் புலங்களையும் நிரப்பவும்',
  'New passwords do not match': 'புதிய கடவுச்சொற்கள் பொருந்தவில்லை',
  'Password must be at least 6 characters': 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்',
  'Password changed successfully': 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது',
  'Failed to change password': 'கடவுச்சொல்லை மாற்றுவதில் தோல்வி',
  'Profile updated': 'சுயவிவரம் புதுப்பிக்கப்பட்டது',
  'Failed to update profile': 'சுயவிவரத்தைப் புதுப்பிப்பதில் தோல்வி',
  'topics': 'தலைப்புகள்',
  'questions': 'வினாக்கள்',
  'My Profile': 'என் சுயவிவரம்',
  'View and manage your account': 'உங்கள் கணக்கைப் பார்த்து நிர்வகிக்கவும்',
  'Profile not available.': 'சுயவிவரம் கிடைக்கவில்லை.',
  'Enter your 6-digit current password': 'உங்கள் 6 இலக்க தற்போதைய கடவுச்சொல்லை உள்ளிடவும்',
  'Enter your new 6-digit password': 'உங்கள் புதிய 6 இலக்க கடவுச்சொல்லை உள்ளிடவும்',
  'Re-enter your new 6-digit password': 'உங்கள் புதிய 6 இலக்க கடவுச்சொல்லை மீண்டும் உள்ளிடவும்',
  'New Password (6 digits)': 'புதிய கடவுச்சொல் (6 இலக்கங்கள்)',
  'Confirm New Password (6 digits)': 'புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும் (6 இலக்கங்கள்)',
  'Update Password': 'கடவுச்சொல்லைப் புதுப்பிக்கவும்',
  'Updating...': 'புதுப்பிக்கப்படுகிறது...',
  'Select exam': 'தேர்வு வகையைத் தேர்ந்தெடுக்கவும்',
  'Select school': 'பள்ளியைத் தேர்ந்தெடுக்கவும்',
  'Upload a CSV file to add multiple students at once.': 'ஒரே நேரத்தில் பல மாணவர்களைச் சேர்க்க CSV கோப்பைப் பதிவேற்றவும்.',
  'Download Student Template': 'மாணவர் மாதிரி கோப்பைப் பதிவிறக்குக',
  'Upload a CSV file to add multiple faculty members to a school.': 'ஒரு பள்ளிக்கு பல ஆசிரியர்களைச் சேர்க்க CSV கோப்பைப் பதிவேற்றவும்.',
  'Download Faculty Template': 'ஆசிரியர் மாதிரி கோப்பைப் பதிவிறக்குக',
  'Class/Standard': 'வகுப்பு / தரம்',
  'Batch Year': 'கல்வியாண்டு',
  'Default password will be set to:': 'இயல்புநிலை கடவுச்சொல் இவ்வாறு அமைக்கப்படும்:',
  'Update user details': 'பயனர் விவரங்களைப் புதுப்பிக்கவும்',
  'Add a new user to the system': 'அமைப்பில் புதிய பயனரைச் சேர்க்கவும்',
  'Active filters:': 'செயலில் உள்ள வடிகட்டிகள்:',
  'Clear all filters': 'அனைத்து வடிகட்டிகளையும் அழிக்க',
  'Loading users...': 'பயனர்கள் விவரம் ஏற்றப்படுகிறது...',
  'No users found': 'பயனர்கள் யாரும் காணப்படவில்லை',
  'No users match your current filters. Try adjusting your search criteria.': 'உங்கள் தற்போதைய வடிகட்டலுக்கு ஏற்ப பயனர்கள் யாரும் இல்லை.',
  'No users have been added yet. Click "Add User" to create one.': 'பயனர்கள் யாரும் இன்னும் சேர்க்கப்படவில்லை.',
  'Actions': 'செயல்கள்',
  'Action': 'செயல்',
  'Created At': 'உருவாக்கப்பட்ட தேதி',
  'Updated At': 'புதுப்பிக்கப்பட்ட தேதி',
  'School': 'பள்ளி',
  'School Name': 'பள்ளியின் பெயர்',
  'School Code': 'பள்ளி குறியீடு',
  'UDISE Code': 'UDISE குறியீடு',
  'District': 'மாவட்டம்',
  'Block': 'வட்டம்',
  'Standard': 'வகுப்பு',
  'Class': 'வகுப்பு',
  'Classes': 'வகுப்புகள்',
  'Section': 'பிரிவு',
  'Management': 'நிர்வாகம்',
  'Government': 'அரசு',
  'Govt': 'அரசு',
  'Aided': 'அரசு உதவிபெறும்',
  'Private': 'தனியார்',
  'Gender': 'பாலினம்',
  'Male': 'ஆண்',
  'Female': 'பெண்',
  'Other': 'மற்றவை',
  'Date of Birth': 'பிறந்த தேதி',
  'Subject': 'பாடம்',
  'Topic': 'தலைப்பு',
  'Subtopic': 'துணைத் தலைப்பு',
  'Marks': 'மதிப்பெண்கள்',
  'Total Marks': 'மொத்த மதிப்பெண்கள்',
  'Passing Marks': 'தேர்ச்சி மதிப்பெண்கள்',
  'Negative Marks': 'எதிர்மறை மதிப்பெண்கள்',
  'Duration': 'கால அளவு',
  'Duration (mins)': 'கால அளவு (நிமிடங்கள்)',
  'Start Time': 'தொடக்க நேரம்',
  'End Time': 'முடிவு நேரம்',
  'Date': 'தேதி',
  'Time': 'நேரம்',
  'Score': 'மதிப்பெண்',
  'Average Score': 'சராசரி மதிப்பெண்',
  'Highest Score': 'அதிகபட்ச மதிப்பெண்',
  'Lowest Score': 'குறைந்தபட்ச மதிப்பெண்',
  'Percentage': 'சதவீதம்',
  'Percent': 'சதவீதம்',
  'Rank': 'தரம்',
  'Class Rank': 'வகுப்பு தரம்',
  'School Rank': 'பள்ளி தரம்',
  'State Rank': 'மாநில தரம்',
  'Attempts': 'முயற்சிகள்',
  'Attempt': 'முயற்சி',
  'Submitted': 'சமர்ப்பிக்கப்பட்டது',
  'Submitted At': 'சமர்ப்பிக்கப்பட்ட நேரம்',
  'Completed': 'முடிக்கப்பட்டது',
  'Pending': 'நிலுவையில் உள்ளது',
  'Passed': 'தேர்ச்சி',
  'Failed': 'தோல்வி',
  'Pass Rate': 'தேர்ச்சி விகிதம்',
  'Pass Count': 'தேர்ச்சி பெற்றோர்',
  'Recipients': 'பெறுநர்கள்',
  'Read Count': 'படித்தவர்கள் எண்ணிக்கை',
  'Sent At': 'அனுப்பப்பட்ட நேரம்',
  'Schedule': 'அட்டவணை',
  'Best': 'சிறந்த மதிப்பெண்',
  'Last test': 'கடைசி தேர்வு',

  // Admin Dashboard
  'Total Students': 'மொத்த மாணவர்கள்',
  'Total Faculty': 'மொத்த ஆசிரியர்கள்',
  'Total Tests': 'மொத்த தேர்வுகள்',
  'Questions': 'வினாக்கள்',
  'Total Questions': 'மொத்த வினாக்கள்',
  'Total Schools': 'மொத்த பள்ளிகள்',
  'Exam Overview': 'தேர்வு கண்ணோட்டம்',
  'Students per School': 'பள்ளி வாரியாக மாணவர்கள்',
  'Quick Actions': 'விரைவுச் செயல்கள்',
  "Welcome back! Here's an overview of your exam management system.": "மீண்டும் வருக! உங்கள் தேர்வு மேலாண்மை அமைப்பின் கண்ணோட்டம் இங்கே.",
  'Loading dashboard...': 'முகப்பு ஏற்றுகிறது...',
  'Loading exams...': 'தேர்வுகள் ஏற்றப்படுகின்றன...',
  'No exam data available.': 'தேர்வு விவரங்கள் எதுவும் கிடைக்கவில்லை.',
  'No students are registered for your school yet.': 'உங்கள் பள்ளியில் இதுவரை மாணவர்கள் யாரும் பதிவு செய்யப்படவில்லை.',

  // Faculty Dashboard & Portal
  'with login': 'உள்நுழைவு உள்ளவர்கள்',
  'With login': 'உள்நுழைவு உள்ளவர்கள்',
  'Published tests': 'வெளியிடப்பட்ட தேர்வுகள்',
  'live now': 'நேரலை தேர்வுகள்',
  'Live now': 'நேரலை தேர்வுகள்',
  'Completed attempts': 'முடிக்கப்பட்ட தேர்வுகள்',
  'by your students': 'உங்கள் மாணவர்களால்',
  'passed': 'தேர்ச்சி',
  'Test reports': 'தேர்வு அறிக்கைகள்',
  'Quick Access': 'விரைவு அணுகல்',
  "Everything about your school's progress in one place": 'உங்கள் பள்ளியின் முன்னேற்றம் பற்றிய அனைத்தும் ஒரே இடத்தில்',
  'Tests for your school': 'உங்கள் பள்ளிக்கான தேர்வுகள்',
  'Upcoming': 'வரவிருப்பவை',
  'None': 'எதுவுமில்லை',
  'Open anytime': 'எப்போதும் எழுதலாம்',
  'Recent results': 'சமீபத்திய முடிவுகள்',
  'All reports': 'அனைத்து அறிக்கைகளும்',
  "Monitor your students' tests and results": "உங்கள் மாணவர்களின் தேர்வுகள் மற்றும் முடிவுகளைக் கண்காணிக்கவும்",
  'Avg score': 'சராசரி மதிப்பெண்',
  'No completed attempts from your students yet.': 'உங்கள் மாணவர்களிடமிருந்து இதுவரை எந்த முயற்சியும் முடிக்கப்படவில்லை.',
  'No published tests are assigned to your school yet.': 'உங்கள் பள்ளிக்கு இதுவரை தேர்வுகள் எதுவும் ஒதுக்கப்படவில்லை.',
  'Results of your school\'s students only': 'உங்கள் பள்ளி மாணவர்களின் தேர்வு முடிவுகள் மட்டுமே',
  'Search by name or EMIS number': 'பெயர் அல்லது EMIS எண் மூலம் தேடுக',
  'Took a test': 'தேர்வு எழுதியவர்கள்',
  'Has login, no attempts': 'உள்நுழைவு உள்ளது, தேர்வு எழுதவில்லை',
  'No login yet': 'உள்நுழைவு இன்னும் இல்லை',
  'No login': 'உள்நுழைவு இல்லை',
  'Sort: Name': 'வரிசைப்படுத்து: பெயர்',
  'Sort: Average score': 'வரிசைப்படுத்து: சராசரி மதிப்பெண்',
  'Sort: Attempts': 'வரிசைப்படுத்து: முயற்சிகள்',
  'Loading students...': 'மாணவர்கள் விவரம் ஏற்றப்படுகிறது...',
  'No students match these filters.': 'இந்த வடிகட்டலுக்கு ஏற்ப மாணவர்கள் யாரும் இல்லை.',

  // Student Dashboard & Portal
  'My Learning Journey': 'என் கற்றல் பயணம்',
  'Current Score': 'தற்போதைய மதிப்பெண்',
  'Tests Attempted': 'எழுதிய தேர்வுகள்',
  'Upcoming Tests': 'வரவிருக்கும் தேர்வுகள்',
  'Recent Results': 'சமீபத்திய முடிவுகள்',
  'Start Test': 'தேர்வைத் தொடங்கு',
  'Resume Test': 'தேர்வைத் தொடர்க',
  'Take Test': 'தேர்வு எழுது',
  'Assigned Tests': 'ஒதுக்கப்பட்ட தேர்வுகள்',
  'View and attempt your assigned tests': 'உங்களுக்கு ஒதுக்கப்பட்ட தேர்வுகளைப் பார்த்து எழுதவும்',
  'Available': 'எழுதக்கூடியவை',
  'Loading tests...': 'தேர்வுகள் ஏற்றப்படுகின்றன...',
  'No tests found': 'தேர்வுகள் எதுவும் காணப்படவில்லை',
  'No tests match your current filters': 'உங்கள் வடிகட்டலுக்கு ஏற்ப தேர்வுகள் எதுவும் இல்லை',
  'Not Started': 'தொடங்கப்படவில்லை',
  'In Progress': 'நடைபெறுகிறது',
  'Results & Performance': 'முடிவுகளும் செயல்திறனும்',
  'Track your exam performance': 'உங்கள் தேர்வு செயல்திறனைக் கண்காணிக்கவும்',
  'Tests Taken': 'எழுதிய தேர்வுகள்',
  'No upcoming tests available': 'வரவிருக்கும் தேர்வுகள் எதுவும் இல்லை',
  'No recent test results available': 'சமீபத்திய தேர்வு முடிவுகள் எதுவும் இல்லை',
  'Complete your first test to see your progress here.': 'உங்கள் முன்னேற்றத்தைக் காண முதல் தேர்வை எழுதுங்கள்.',
  "You're getting better with every test.": 'ஒவ்வொரு தேர்விலும் நீங்கள் முன்னேறி வருகிறீர்கள்.',
  'Every test is a step forward. Keep going.': 'ஒவ்வொரு தேர்வும் ஒரு முன்னேற்றப் படி. தொடர்ந்து முயலுங்கள்.',
  'Start Your Learning Journey': 'உங்கள் கற்றல் பயணத்தைத் தொடங்குங்கள்',
  'Complete your first test to unlock your progress dashboard.': 'உங்கள் முன்னேற்ற முகப்பைப் பார்க்க முதல் தேர்வை முடியுங்கள்.',
  'mins': 'நிமிடங்கள்',
  'min': 'நிமிடம்',
  'Personal Best': 'தனிப்பட்ட சாதனை',
  'Learning Streak': 'கற்றல் தொடர்ச்சி',
  'Rising Star': 'வளர்ந்து வரும் நட்சத்திரம்',
  'First Test': 'முதல் தேர்வு',
  'Subject Ace': 'பாடச் சாதனையாளர்',
  'Apprentice': 'தொடக்க மாணவர்',
  'Scholar': 'அறிஞர்',
  'Achiever': 'சாதனையாளர்',
  'Grandmaster': 'முதுநிலை மேதை',

  // Student Dashboard - Learning Journey, Subject Journey, Focus & Milestones
  'Your Learning Journey': 'உங்கள் கற்றல் பயணம்',
  'See how your performance is changing over time.': 'காலப்போக்கில் உங்கள் செயல்திறன் எவ்வாறு மாறுகிறது என்பதைப் பாருங்கள்.',
  'Your graph will appear here': 'உங்கள் வரைபடம் இங்கே தோன்றும்',
  'Complete your first test to start tracking your progress over time.': 'காலப்போக்கில் உங்கள் முன்னேற்றத்தைக் கண்காணிக்க உங்கள் முதல் தேர்வை முடிக்கவும்.',
  'Take First Test →': 'முதல் தேர்வை எழுதுக →',
  'Take First Test': 'முதல் தேர்வை எழுதுக',
  'Last 5': 'கடைசி 5',
  'All History': 'முழு வரலாறு',
  'All results →': 'அனைத்து முடிவுகளும் →',
  'All results': 'அனைத்து முடிவுகளும்',
  'View all results →': 'அனைத்து முடிவுகளையும் காண்க →',
  'View all results': 'அனைத்து முடிவுகளையும் காண்க',
  'Your journey has started!': 'உங்கள் பயணம் தொடங்கிவிட்டது!',
  'Complete another test to see your progress trend.': 'உங்கள் முன்னேற்றப் போக்கைக் காண மற்றொரு தேர்வை முடிக்கவும்.',
  "You're improving!": 'நீங்கள் முன்னேறி வருகிறீர்கள்!',
  'Keep going!': 'தொடர்ந்து செல்லுங்கள்!',
  'This test was a little lower. You can improve in the next one.': 'இந்த தேர்வில் சற்று குறைந்துள்ளது. அடுத்த தேர்வில் முன்னேறலாம்.',
  "You're staying consistent!": 'நீங்கள் சீராகச் செயல்பட்டு வருகிறீர்கள்!',
  'Keep going to reach your next milestone.': 'உங்கள் அடுத்த மைல்கல்லை அடைய தொடர்ந்து முயற்சி செய்யுங்கள்.',
  'Your Subject Journey': 'உங்கள் பாடப் பயணம்',
  'Average score per subject': 'பாடம் வாரியாக சராசரி மதிப்பெண்',
  'No test data yet.': 'தேர்வு விவரங்கள் எதுவும் இன்னும் இல்லை.',
  'No test data yet': 'தேர்வு விவரங்கள் எதுவும் இன்னும் இல்லை',
  'Your subject journey will appear here after your first test.': 'முதல் தேர்வுக்குப் பிறகு உங்கள் பாடப் பயணம் இங்கே தோன்றும்.',
  'Your Next Focus': 'உங்கள் அடுத்த கவனம்',
  'Where to improve most': 'அதிகமாக முன்னேற வேண்டிய பகுதி',
  'Take tests across subjects to see where to focus.': 'எதில் கவனம் செலுத்த வேண்டும் என்பதைப் பார்க்க பாட வாரியாகத் தேர்வுகளை எழுதுங்கள்.',
  'current avg': 'தற்போதைய சராசரி',
  'tests completed': 'தேர்வுகள் முடிக்கப்பட்டன',
  'Your Milestones': 'உங்கள் மைல்கற்கள்',
  'Achievements earned along your journey': 'உங்கள் பயணத்தில் நீங்கள் அடைந்த சாதனைகள்',
  'Earned': 'பெறப்பட்டது',
  'Locked': 'பூட்டப்பட்டது',
  'Not started yet': 'இன்னும் தொடங்கப்படவில்லை',
  '1st Assessment Done': 'முதல் மதிப்பீடு முடிந்தது',
  'Take and finish 1 test': '1 தேர்வை எழுதி முடிக்கவும்',
  'Increase score vs last test': 'முந்தைய தேர்வை விட மதிப்பெண்ணை உயர்த்தவும்',
  'Beat previous test score': 'முந்தைய தேர்வு மதிப்பெண்ணை மிஞ்சவும்',
  'Set a high score record': 'அதிகபட்ச மதிப்பெண் சாதனையை அமைக்கவும்',
  'Establish highest score': 'அதிகபட்ச மதிப்பெண்ணை நிலைநாட்டவும்',
  'Build a regular habit': 'தொடர்ச்சியான கற்றல் பழக்கத்தை உருவாக்கவும்',
  'Complete 3+ tests': '3+ தேர்வுகளை முடிக்கவும்',
  'Master any subject': 'ஏதேனும் ஒரு பாடத்தில் தேர்ச்சி பெறவும்',
  'Score 80%+ subject average': 'பாடச் சராசரியில் 80%+ பெறவும்',
  'No tests yet': 'இன்னும் தேர்வுகள் இல்லை',
  '🏆 Your strongest subject': '🏆 உங்கள் மிகச் சிறந்த பாடம்',
  'Your strongest subject': 'உங்கள் மிகச் சிறந்த பாடம்',
  'Doing great': 'சிறப்பாகச் செய்கிறீர்கள்',
  'Almost there': 'கிட்டத்தட்ட இலக்கை நெருங்கிவிட்டீர்கள்',
  'Keep building': 'தொடர்ந்து வளர்த்துக் கொள்ளுங்கள்',
  'Keep practicing': 'தொடர்ந்து பயிற்சி செய்யுங்கள்',
  'Starting point': 'தொடக்கப் புள்ளி',
  'Starting now': 'இப்போது தொடங்குகிறது',
  'Same as previous': 'முந்தையது போலவே',
  'vs previous': 'முந்தையதை விட',
  'Trend': 'போக்கு',
  'Improvement': 'முன்னேற்றம்',
  'Next Test': 'அடுத்த தேர்வு',
  'LIVE': 'நேரலை',
  'Start': 'தொடங்கு',
  'Details': 'விவரங்கள்',
  'Your learning journey starts here! 🚀': 'உங்கள் கற்றல் பயணம் இங்கே தொடங்குகிறது! 🚀',
  'NEW PERSONAL BEST! 🏆': 'புதிய தனிப்பட்ட சாதனை! 🏆',
  'This is amazing! 🔥': 'இது அற்புதம்! 🔥',
  'Nice improvement! 📈': 'சிறந்த முன்னேற்றம்! 📈',
  "Keep going. You've got this! 💪": 'தொடர்ந்து முன்னேறுங்கள். உங்களால் முடியும்! 💪',
  'Ready for your next test? 🎯': 'அடுத்த தேர்வுக்குத் தயாரா? 🎯',
  "You're keeping the streak going! 🔥": 'தொடர் வெற்றியை நிலைநிறுத்துகிறீர்கள்! 🔥',
  'Ready to learn?': 'கற்கத் தயாரா?',

  // Help & Instructions (Student & All Users)
  'Help & Instructions': 'உதவி & வழிகாட்டுதல்கள்',
  'Everything you need to know about exams': 'தேர்வுகள் பற்றி நீங்கள் தெரிந்து கொள்ள வேண்டிய அனைத்தும்',
  'Exam Rules & Guidelines': 'தேர்வு விதிகள் & வழிகாட்டுதல்கள்',
  'Read each question carefully before answering.': 'பதிலளிப்பதற்கு முன் ஒவ்வொரு வினாவையும் கவனமாகப் படிக்கவும்.',
  'Each question carries 4 marks for a correct answer.': 'சரியான விடைக்கு 4 மதிப்பெண்கள் வழங்கப்படும்.',
  'Negative marking: 1 mark will be deducted for each wrong answer.': 'எதிர்மறை மதிப்பெண்: தவறான விடைக்கு 1 மதிப்பெண் கழிக்கப்படும்.',
  'No marks will be deducted for unattempted questions.': 'எழுதப்படாத வினாக்களுக்கு மதிப்பெண்கள் கழிக்கப்படாது.',
  'Once you submit the exam, you cannot go back or modify answers.': 'தேர்வைச் சமர்ப்பித்த பிறகு, நீங்கள் மீண்டும் சென்று விடைகளை மாற்ற முடியாது.',
  'The timer will auto-submit your exam when time expires.': 'நேரம் முடியும் போது உங்கள் தேர்வு தானாகவே சமர்ப்பிக்கப்படும்.',
  'Do not refresh the page during the exam.': 'தேர்வின் போது பக்கத்தை புதுப்பிக்க (refresh) வேண்டாம்.',
  "Use the 'Mark for Review' feature to revisit questions later.": "வினாக்களை பின்னர் மறுபரிசீலனை செய்ய 'மறுபரிசீலனைக்குக் குறிக்க' அம்சத்தைப் பயன்படுத்தவும்.",
  'Ensure stable internet connection throughout the exam.': 'தேர்வு முழுவதும் நிலையான இணைய இணைப்பு இருப்பதை உறுதி செய்யவும்.',
  'Contact support immediately if you face technical issues.': 'தொழில்நுட்ப சிக்கல்கள் ஏற்பட்டால் உடனடியாக உதவி மையத்தைத் தொடர்பு கொள்ளவும்.',
  'Marking Scheme': 'மதிப்பெண் முறை',
  'Correct Answer': 'சரியான விடை',
  'Wrong Answer': 'தவறான விடை',
  'Negative marking applies. Attempt only if you are confident about the answer.': 'எதிர்மறை மதிப்பெண் உண்டு. விடை உறுதியாகத் தெரிந்தால் மட்டுமே எழுதவும்.',
  'Common Issues & Solutions': 'பொதுவான சிக்கல்களும் தீர்வுகளும்',
  'What should I do if my exam gets stuck?': 'என் தேர்வு தடைபட்டால் நான் என்ன செய்ய வேண்டும்?',
  'Try refreshing the page. Your progress is auto-saved. If the issue persists, contact support immediately with your test ID.': 'பக்கத்தை புதுப்பித்து (refresh) பார்க்கவும். உங்கள் விடைகள் தானாகவே சேமிக்கப்படும். சிக்கல் தொடர்ந்தால் உங்கள் தேர்வு ஐடியுடன் உடனடியாக ஆதரவுக் குழுவைத் தொடர்பு கொள்ளவும்.',
  'My timer stopped working. What should I do?': 'நேரங்காட்டி (timer) இயங்குவது நின்றால் என்ன செய்வது?',
  "Refresh the page immediately. The server keeps track of actual time, so don't worry about losing time.": 'உடனடியாக பக்கத்தை புதுப்பிக்கவும். சேவையகம் (server) சரியான நேரத்தைக் கண்காணிப்பதால், நேரம் இழக்கப்படும் என்று கவலைப்பட வேண்டாம்.',
  'I accidentally closed the browser during exam.': 'தேர்வின் போது தவறுதலாக உலாவியை (browser) மூடிவிட்டேன்.',
  'Open the exam link again and log in. You can continue from where you left off if time permits.': 'தேர்வு இணைப்பை மீண்டும் திறந்து உள்நுழையவும். நேரம் இருந்தால் விட்ட இடத்திலிருந்து தொடரலாம்.',
  "I can't see the Submit button.": 'எனக்கு சமர்ப்பிக்கும் (Submit) பொத்தான் தெரியவில்லை.',
  "Navigate to the last question using Next button. The Submit button appears on the last question page.": "'அடுத்து' பொத்தானைப் பயன்படுத்தி கடைசி வினாவிற்குச் செல்லவும். கடைசி வினா பக்கத்தில் சமர்ப்பிக்கும் பொத்தான் தோன்றும்.",
  "My answer didn't save.": 'என் விடை சேமிக்கப்படவில்லை.',
  'Answers are auto-saved when you select an option. If you see issues, try selecting the option again.': 'நீங்கள் விடையைத் தேர்ந்தெடுக்கும் போதே தானாகச் சேமிக்கப்படும். ஏதேனும் சிக்கல் இருந்தால் விடையை மீண்டும் தேர்ந்தெடுக்கவும்.',
  'Contact Support': 'உதவி மையத்தைத் தொடர்பு கொள்க',
  'Need help? Our support team is available 24/7 during exam hours.': 'உதவி தேவையா? தேர்வு நேரங்களில் எங்கள் ஆதரவுக் குழு 24/7 தயார் நிலையில் உள்ளது.',
  'Call Us': 'எங்களை அழைக்கவும்',
  'Email Us': 'மின்னஞ்சல் அனுப்பவும்',

  // Exam Interface (UI controls only - questions are never touched)
  'Time Remaining': 'மீதமுள்ள நேரம்',
  'Question Palette': 'வினா வரிசை',
  'Mark for Review': 'மறுபரிசீலனைக்குக் குறிக்க',
  'Marked for Review': 'மறுபரிசீலனைக்குக் குறிக்கப்பட்டது',
  'Clear Response': 'பதிலை அழிக்க',
  'Save & Next': 'சேமித்து அடுத்து செல்க',
  'Submit Test': 'தேர்வைச் சமர்ப்பி',
  'Are you sure you want to submit?': 'தேர்வைச் சமர்ப்பிக்க விரும்புகிறீர்களா?',
  'Answered': 'பதிலளிக்கப்பட்டது',
  'Not Answered': 'பதிலளிக்கப்படவில்லை',
  'Not Visited': 'பார்க்கப்படவில்லை',
  'Answered & Marked': 'பதிலளித்து மறுபரிசீலனைக்குக் குறிக்கப்பட்டது',
  'Question': 'வினா',
  'Options': 'விடைக் குறிப்புகள்',
  'Option A': 'விடை A',
  'Option B': 'விடை B',
  'Option C': 'விடை C',
  'Option D': 'விடை D',
  'Test Completed': 'தேர்வு முடிந்தது',
  'Submitted Successfully': 'வெற்றிகரமாகச் சமர்ப்பிக்கப்பட்டது',
  'Congratulations': 'வாழ்த்துகள்',
  'Your Score': 'உங்கள் மதிப்பெண்',
  'Correct Answers': 'சரியான விடைகள்',
  'Incorrect Answers': 'தவறான விடைகள்',
  'Unattempted': 'எழுதப்படாதவை',
  'Accuracy': 'துல்லியம்',
  'Time Spent': 'செலவழித்த நேரம்',

  // Placeholders
  'Search...': 'தேடுக...',
  'Search users...': 'பயனர்களைத் தேடுக...',
  'Search schools...': 'பள்ளிகளைத் தேடுக...',
  'Search subjects...': 'பாடங்களைத் தேடுக...',
  'Search topics...': 'தலைப்புகளைத் தேடுக...',
  'Search questions...': 'வினாக்களைத் தேடுக...',
  'Search tests...': 'தேர்வுகளைத் தேடுக...',
  'Select School': 'பள்ளியைத் தேர்ந்தெடுக்கவும்',
  'Select Subject': 'பாடத்தைத் தேர்ந்தெடுக்கவும்',
  'Select Topic': 'தலைப்பைத் தேர்ந்தெடுக்கவும்',
  'Select Standard': 'வகுப்பைத் தேர்ந்தெடுக்கவும்',
  'Select Role': 'பங்கைத் தேர்ந்தெடுக்கவும்',
  'Select Status': 'நிலையைத் தேர்ந்தெடுக்கவும்',
  'Select Exam': 'தேர்வு வகையைத் தேர்ந்தெடுக்கவும்',
};

// ============================================================================
// Reverse Dictionary: Tamil -> English (taToEnMap)
// Automatically includes inverted entries from enToTaMap PLUS source-code Tamil phrases
// ============================================================================
export const taToEnMap: Record<string, string> = {
  // Common Tamil labels that may appear in code or database
  'அரசு': 'Government',
  'ரத்து செய்க': 'Cancel',
  'அனுப்புக': 'Send',
  'தலைப்பு': 'Topic',
  'துணைத் தலைப்பு': 'Subtopic',
  'துணைத்தலைப்பு': 'Subtopic',
  'பாடம்': 'Subject',
  'பாடம': 'Subject',
  'அறிக்கைகள்': 'Reports',
  'பள்ளி': 'School',
  'வகுப்பு': 'Class',
  'வகுப்புகள்': 'Classes',
  'விடை A': 'Option A',
  'விடை B': 'Option B',
  'விடை C': 'Option C',
  'விடை D': 'Option D',
  'தேர்வு உருவாக்கு': 'Create Test',
  'தேர்வு உருவாக்குக': 'Create Test',
  'புதிய பாடம் சேர்க்க': 'Add Subject',
  'புதிய வினா சேர்க்க': 'Add Question',
  'சேமிக்க': 'Save',
  'திருத்துக': 'Edit',
  'நீக்குக': 'Delete',
  'வெளியிடுக': 'Publish',
  'சமர்ப்பிக்க': 'Submit',
  'முகப்பு': 'Dashboard',
  'மாணவர்கள்': 'Students',
  'ஆசிரியர்கள்': 'Faculty',
  'தேர்வுகள்': 'Tests',
  'முடிவுகள்': 'Results',
  'செய்திகள்': 'Messages',
  'அறிவிப்புகள்': 'Notifications',
  'சுயவிவரம்': 'Profile',
  'அமைப்புகள்': 'Settings',
  'வெளியேறு': 'Logout',
  'உள்நுழைக': 'Sign In',
  'பதிவு செய்க': 'Sign Up',
  'அனைத்துப் பள்ளிகள்': 'All schools',
  'அனைத்துத் தேர்வுகள்': 'All tests',
  'அனைத்து வகுப்புகள்': 'All classes',
};

// Populate reverse dictionary from enToTaMap
for (const [en, ta] of Object.entries(enToTaMap)) {
  if (!taToEnMap[ta]) {
    taToEnMap[ta] = en;
  }
}

// Precompute lowercased lookup maps for fast, case-insensitive lookups
const enToTaLowerMap: Record<string, string> = {};
for (const [k, v] of Object.entries(enToTaMap)) {
  enToTaLowerMap[k.toLowerCase()] = v;
}

const taToEnLowerMap: Record<string, string> = {};
for (const [k, v] of Object.entries(taToEnMap)) {
  taToEnLowerMap[k.toLowerCase()] = v;
}

// Intelligent punctuation & prefix lookup handler
function findTranslation(text: string, targetLang: Language): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // Normalize multiple spaces and newlines to a single space
  const normalized = trimmed.replace(/\s+/g, ' ');

  if (targetLang === 'ta') {
    // 1. Direct match
    if (enToTaMap[normalized]) return enToTaMap[normalized];
    if (enToTaLowerMap[normalized.toLowerCase()]) return enToTaLowerMap[normalized.toLowerCase()];

    // 2. Trailing punctuation like " *", "*", ":", "...", ".", "?", "→"
    const punctMatch = normalized.match(/^(.*?)\s*([\*:\.\?→]+|\.{3})$/);
    if (punctMatch) {
      const core = punctMatch[1].trim();
      const punct = punctMatch[2];
      const transCore = enToTaMap[core] || enToTaLowerMap[core.toLowerCase()];
      if (transCore) {
        return punct.startsWith('*') ? `${transCore} *` : punct === ':' ? `${transCore}:` : punct === '→' ? `${transCore} →` : `${transCore}${punct}`;
      }
    }

    // 3. Numbered prefixes like "1. Assigned Schools", "2. Classes"
    const numberedMatch = normalized.match(/^(\d+\.\s*)(.*)$/);
    if (numberedMatch) {
      const numPrefix = numberedMatch[1];
      const core = numberedMatch[2].trim();
      const transCore = enToTaMap[core] || enToTaLowerMap[core.toLowerCase()];
      if (transCore) {
        return `${numPrefix}${transCore}`;
      }
    }

    // 4. Counts in parentheses like "Admin (2)", "Student (304)", "All Status (308)", "All Classes (304 students)"
    const countMatch = normalized.match(/^(.*?)\s*\((.*?)\)$/);
    if (countMatch) {
      const core = countMatch[1].trim();
      let inner = countMatch[2].trim();
      const transCore = enToTaMap[core] || enToTaLowerMap[core.toLowerCase()];
      if (transCore) {
        inner = inner.replace(/\bstudents\b/i, 'மாணவர்கள்');
        return `${transCore} (${inner})`;
      }
    }

    // 5. "Class X" like "Class 12", "Class VII - A"
    const classMatch = normalized.match(/^Class\s+(.+)$/i);
    if (classMatch) {
      return `வகுப்பு ${classMatch[1]}`;
    }

    // 6. Dynamic student metrics and patterns
    const completedMatch = normalized.match(/^(\d+)\s+of\s+(\d+)\s+tests completed$/i);
    if (completedMatch) {
      return `${completedMatch[1]} / ${completedMatch[2]} தேர்வுகள் முடிக்கப்பட்டன`;
    }

    const testAttemptMatch = normalized.match(/^(\d+)\s+tests?\s+attempted$/i);
    if (testAttemptMatch) {
      return `${testAttemptMatch[1]} தேர்வுகள் எழுதப்பட்டன`;
    }

    const testCountMatch = normalized.match(/^(\d+)\s+tests?$/i);
    if (testCountMatch) {
      return `${testCountMatch[1]} தேர்வுகள்`;
    }

    const levelMatch = normalized.match(/^Level\s+(\d+)\s*·\s*(.+)$/i);
    if (levelMatch) {
      const transTitle = enToTaMap[levelMatch[2].trim()] || levelMatch[2].trim();
      return `நிலை ${levelMatch[1]} · ${transTitle}`;
    }

    const daysMatch = normalized.match(/^(\d+)\s+days?$/i);
    if (daysMatch) {
      return `${daysMatch[1]} நாட்கள்`;
    }

    const habitMatch = normalized.match(/^(\d+)\s+test habit active$/i);
    if (habitMatch) {
      return `${habitMatch[1]} தேர்வு பழக்கம் செயலில் உள்ளது`;
    }

    const boostMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)%\s+score boost$/i);
    if (boostMatch) {
      return `${boostMatch[1]}% மதிப்பெண் உயர்வு`;
    }

    const recordMatch = normalized.match(/^(\d+(?:\.\d+)?)%\s+all-time record$/i);
    if (recordMatch) {
      return `${recordMatch[1]}% சிறந்த சாதனை`;
    }

    const startsInMatch = normalized.match(/^Starts in\s+(.+)$/i);
    if (startsInMatch) {
      return `${startsInMatch[1]} இல் தொடங்குகிறது`;
    }

    const vsPrevMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)%\s+vs previous$/i);
    if (vsPrevMatch) {
      return `${vsPrevMatch[1]}% முந்தையதை விட`;
    }

    const heyMatch = normalized.match(/^Hey,\s*(.*?)(!.*)?$/i);
    if (heyMatch) {
      return `வணக்கம், ${heyMatch[1]}! 👋`;
    }

    const scoreIncMatch = normalized.match(/^Your score increased by\s+(\d+(?:\.\d+)?)%\s+compared with your previous test\.$/i);
    if (scoreIncMatch) {
      return `முந்தைய தேர்வை விட உங்கள் மதிப்பெண் ${scoreIncMatch[1]}% அதிகரித்துள்ளது.`;
    }

    const lookingStrongMatch = normalized.match(/^(.+?)\s+is looking strong\.\s+Keep the momentum going!$/i);
    if (lookingStrongMatch) {
      const subj = enToTaMap[lookingStrongMatch[1].trim()] || lookingStrongMatch[1].trim();
      return `${subj} சிறப்பான நிலையில் உள்ளது. தொடர்ந்து முன்னேறுங்கள்!`;
    }

    const practiceMatch = normalized.match(/^A little more practice in\s+(.+?)\s+can help you improve in your next test\.$/i);
    if (practiceMatch) {
      const subj = enToTaMap[practiceMatch[1].trim()] || practiceMatch[1].trim();
      return `${subj} பாடத்தில் இன்னும் கொஞ்சம் பயிற்சி அடுத்த தேர்வில் முன்னேற உதவும்.`;
    }

    const workTogetherMatch = normalized.match(/^Let's work on\s+(.+?)\s+together\.$/i);
    if (workTogetherMatch) {
      const subj = enToTaMap[workTogetherMatch[1].trim()] || workTogetherMatch[1].trim();
      return `நாம் இருவரும் இணைந்து ${subj} பாடத்தில் பயிற்சி பெறுவோம்.`;
    }

    return null;
  } else {
    // targetLang === 'en'
    // 1. Direct match
    if (taToEnMap[normalized]) return taToEnMap[normalized];
    if (taToEnLowerMap[normalized.toLowerCase()]) return taToEnLowerMap[normalized.toLowerCase()];

    // 2. Trailing punctuation
    const punctMatch = normalized.match(/^(.*?)\s*([\*:\.\?→]+|\.{3})$/);
    if (punctMatch) {
      const core = punctMatch[1].trim();
      const punct = punctMatch[2];
      const transCore = taToEnMap[core] || taToEnLowerMap[core.toLowerCase()];
      if (transCore) {
        return punct.startsWith('*') ? `${transCore} *` : punct === ':' ? `${transCore}:` : punct === '→' ? `${transCore} →` : `${transCore}${punct}`;
      }
    }

    // 3. Numbered prefixes
    const numberedMatch = normalized.match(/^(\d+\.\s*)(.*)$/);
    if (numberedMatch) {
      const numPrefix = numberedMatch[1];
      const core = numberedMatch[2].trim();
      const transCore = taToEnMap[core] || taToEnLowerMap[core.toLowerCase()];
      if (transCore) {
        return `${numPrefix}${transCore}`;
      }
    }

    // 4. Counts in parentheses like "நிர்வாகி (2)", "மாணவர் (304)", "அனைத்து நிலைகளும் (308)"
    const countMatch = normalized.match(/^(.*?)\s*\((.*?)\)$/);
    if (countMatch) {
      const core = countMatch[1].trim();
      let inner = countMatch[2].trim();
      const transCore = taToEnMap[core] || taToEnLowerMap[core.toLowerCase()];
      if (transCore) {
        inner = inner.replace('மாணவர்கள்', 'students');
        return `${transCore} (${inner})`;
      }
    }

    // 5. "வகுப்பு X" like "வகுப்பு 12", "வகுப்பு VII - A"
    const classMatch = normalized.match(/^வகுப்பு\s+(.+)$/);
    if (classMatch) {
      return `Class ${classMatch[1]}`;
    }

    // 6. Dynamic student metrics and patterns
    const completedMatch = normalized.match(/^(\d+)\s*\/\s*(\d+)\s+தேர்வுகள் முடிக்கப்பட்டன$/);
    if (completedMatch) {
      return `${completedMatch[1]} of ${completedMatch[2]} tests completed`;
    }

    const testAttemptMatch = normalized.match(/^(\d+)\s+தேர்வுகள் எழுதப்பட்டன$/);
    if (testAttemptMatch) {
      return `${testAttemptMatch[1]} tests attempted`;
    }

    const testCountMatch = normalized.match(/^(\d+)\s+தேர்வுகள்$/);
    if (testCountMatch) {
      return `${testCountMatch[1]} tests`;
    }

    const levelMatch = normalized.match(/^நிலை\s+(\d+)\s*·\s*(.+)$/);
    if (levelMatch) {
      const transTitle = taToEnMap[levelMatch[2].trim()] || levelMatch[2].trim();
      return `Level ${levelMatch[1]} · ${transTitle}`;
    }

    const daysMatch = normalized.match(/^(\d+)\s+நாட்கள்$/);
    if (daysMatch) {
      return `${daysMatch[1]} days`;
    }

    const habitMatch = normalized.match(/^(\d+)\s+தேர்வு பழக்கம் செயலில் உள்ளது$/);
    if (habitMatch) {
      return `${habitMatch[1]} test habit active`;
    }

    const boostMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)%\s+மதிப்பெண் உயர்வு$/);
    if (boostMatch) {
      return `${boostMatch[1]}% score boost`;
    }

    const recordMatch = normalized.match(/^(\d+(?:\.\d+)?)%\s+சிறந்த சாதனை$/);
    if (recordMatch) {
      return `${recordMatch[1]}% all-time record`;
    }

    const startsInMatch = normalized.match(/^(.+)\s+இல் தொடங்குகிறது$/);
    if (startsInMatch) {
      return `Starts in ${startsInMatch[1]}`;
    }

    const vsPrevMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)%\s+முந்தையதை விட$/);
    if (vsPrevMatch) {
      return `${vsPrevMatch[1]}% vs previous`;
    }

    const heyMatch = normalized.match(/^வணக்கம்,\s*(.*?)(!.*)?$/);
    if (heyMatch) {
      return `Hey, ${heyMatch[1]}! 👋`;
    }

    const scoreIncMatch = normalized.match(/^முந்தைய தேர்வை விட உங்கள் மதிப்பெண்\s+(\d+(?:\.\d+)?)%\s+அதிகரித்துள்ளது\.$/);
    if (scoreIncMatch) {
      return `Your score increased by ${scoreIncMatch[1]}% compared with your previous test.`;
    }

    const lookingStrongMatch = normalized.match(/^(.+?)\s+சிறப்பான நிலையில் உள்ளது\.\s+தொடர்ந்து முன்னேறுங்கள்!$/);
    if (lookingStrongMatch) {
      const subj = taToEnMap[lookingStrongMatch[1].trim()] || lookingStrongMatch[1].trim();
      return `${subj} is looking strong. Keep the momentum going!`;
    }

    const practiceMatch = normalized.match(/^(.+?)\s+பாடப்பிரிவில் இன்னும் கொஞ்சம் பயிற்சி அடுத்த தேர்வில் முன்னேற உதவும்\.$/);
    if (practiceMatch) {
      const subj = taToEnMap[practiceMatch[1].trim()] || practiceMatch[1].trim();
      return `A little more practice in ${subj} can help you improve in your next test.`;
    }

    const workTogetherMatch = normalized.match(/^நாம் இருவரும் இணைந்து\s+(.+?)\s+பாடப்பிரிவில் பயிற்சி பெறுவோம்\.$/);
    if (workTogetherMatch) {
      const subj = taToEnMap[workTogetherMatch[1].trim()] || workTogetherMatch[1].trim();
      return `Let's work on ${subj} together.`;
    }

    return null;
  }
}

// Global WeakMaps for tracking original texts and applied values
const originalTextMap = new WeakMap<Node, string>();
const appliedTextMap = new WeakMap<Node, string>();
const originalAttrMap = new WeakMap<Element, Record<string, string>>();

// Protection rules: MUST NEVER touch math, code, questions or answer options!
function isProtectedElement(el: Element | null): boolean {
  if (!el) return false;
  // Code, math formulas, scripts, or explicitly marked areas
  if (el.closest('.katex, math, code, pre, script, style, [data-no-translate="true"]')) {
    return true;
  }
  // Questions and question choices stay exactly as authored in DB
  if (el.closest('[data-question-content], [data-question-text], .question-text, .question-content, .option-text, .question-card-text')) {
    return true;
  }
  return false;
}

function isProtectedText(parent: Element | null): boolean {
  if (!parent) return true;
  if (isProtectedElement(parent)) return true;
  // Protect text nodes inside inputs/textareas (e.g. user typed values)
  if (parent.closest('textarea, input')) {
    return true;
  }
  return false;
}

function translateTextNode(node: Text, lang: Language) {
  const parent = node.parentElement;
  if (!parent || isProtectedText(parent)) return;

  const currentVal = node.nodeValue || '';
  const lastApplied = appliedTextMap.get(node);

  // If node has not been seen yet OR React updated the text node content externally
  if (!originalTextMap.has(node) || (lastApplied !== undefined && currentVal !== lastApplied)) {
    originalTextMap.set(node, currentVal);
  }

  const orig = originalTextMap.get(node) || '';

  if (lang === 'ta') {
    const translated = findTranslation(orig, 'ta');
    if (translated) {
      const leading = orig.match(/^\s*/)?.[0] || '';
      const trailing = orig.match(/\s*$/)?.[0] || '';
      const newVal = `${leading}${translated}${trailing}`;
      node.nodeValue = newVal;
      appliedTextMap.set(node, newVal);
    }
  } else {
    // lang === 'en'
    const translatedToEn = findTranslation(orig, 'en');
    if (translatedToEn) {
      const leading = orig.match(/^\s*/)?.[0] || '';
      const trailing = orig.match(/\s*$/)?.[0] || '';
      const newVal = `${leading}${translatedToEn}${trailing}`;
      node.nodeValue = newVal;
      appliedTextMap.set(node, newVal);
    } else {
      // restore original
      node.nodeValue = orig;
      appliedTextMap.set(node, orig);
    }
  }
}

function translateElementAttributes(el: Element, lang: Language) {
  if (isProtectedElement(el)) return;

  const attrs = ['placeholder', 'title'];
  for (const attr of attrs) {
    const val = el.getAttribute(attr);
    if (!val) continue;

    let saved = originalAttrMap.get(el);
    if (!saved) {
      saved = {};
      originalAttrMap.set(el, saved);
    }

    if (!saved[attr]) {
      saved[attr] = val;
    }
    const orig = saved[attr];

    if (lang === 'ta') {
      const translated = findTranslation(orig, 'ta');
      if (translated) {
        el.setAttribute(attr, translated);
      }
    } else {
      // English mode
      const transToEn = findTranslation(orig, 'en');
      if (transToEn) {
        el.setAttribute(attr, transToEn);
      } else {
        el.setAttribute(attr, orig);
      }
    }
  }
}

function walkTree(root: Node, lang: Language) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, lang);
    return;
  }
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (isProtectedElement(el)) return;
    translateElementAttributes(el, lang);
    for (let child = el.firstChild; child; child = child.nextSibling) {
      walkTree(child, lang);
    }
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default language is Tamil ('ta')
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    if (saved === 'en' || saved === 'ta') {
      return saved;
    }
    return 'ta';
  });

  const languageRef = useRef<Language>(language);
  languageRef.current = language;

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'ta' ? 'en' : 'ta';
    setLanguage(nextLang);
  };

  const t = (key: string, defaultText?: string): string => {
    if (language === 'en') {
      const transEn = findTranslation(key, 'en');
      if (transEn) return transEn;
      return defaultText || key;
    }
    // Language is 'ta'
    const trans = findTranslation(key, 'ta');
    if (trans) return trans;
    if (defaultText) {
      const transDef = findTranslation(defaultText, 'ta');
      if (transDef) return transDef;
    }
    return defaultText || key;
  };

  // Live DOM Interceptor & Auto-Translator
  useEffect(() => {
    // 1. Initial walk on current document
    walkTree(document.body, language);

    // 2. Observe DOM mutations (new components, route changes, modals, selects, portals)
    let animationFrameId: number | null = null;
    const pendingNodes: Node[] = [];

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            pendingNodes.push(mutation.addedNodes[i]);
          }
        } else if (mutation.type === 'characterData') {
          pendingNodes.push(mutation.target);
        }
      }

      if (pendingNodes.length > 0 && animationFrameId === null) {
        animationFrameId = requestAnimationFrame(() => {
          while (pendingNodes.length > 0) {
            const n = pendingNodes.shift();
            if (n && n.isConnected) {
              walkTree(n, languageRef.current);
            }
          }
          animationFrameId = null;
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
