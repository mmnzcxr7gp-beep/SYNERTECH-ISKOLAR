const express = require('express');
const router = express.Router();

const PRIVACY_POLICY = {
  lastUpdated: '2026-07-13',
  title: 'ISKOLAR Privacy Policy',
  sections: [
    {
      heading: '1. Information We Collect',
      content: `We collect the following personal information when you register and use the ISKOLAR application:
• Full name (first name, middle name, last name)
• Email address
• Date of birth
• Contact information (mobile number, address)
• Educational information (school, course, year level, GPA)
• Government-issued identification documents (IDs, birth certificates)
• Photographs (profile picture, selfie with ID)
• Scholarship application details
• Financial information (family income, payment methods)`,
    },
    {
      heading: '2. Why We Collect This Information',
      content: `Your personal information is collected for the following purposes:
• To verify your identity and prevent fraudulent applications
• To process scholarship applications on your behalf
• To match you with eligible scholarship opportunities
• To communicate with you about your application status
• To schedule examinations and interviews
• To facilitate scholarship fund disbursement
• To generate reports for scholarship providers`,
    },
    {
      heading: '3. Who Can Access Your Information',
      content: `Your information may be accessed by:
• ISKOLAR system administrators for system management and support
• Scholarship providers and sponsors for application review and verification
• Authorized staff conducting document verification
• You, the account holder, at any time through your profile

Your information is never sold to third parties.`,
    },
    {
      heading: '4. How Your Information is Stored',
      content: `• All data is stored in encrypted databases
• Document uploads are stored in secure cloud storage
• Passwords are cryptographically hashed and never stored in plain text
• Access to systems is protected by authentication and role-based access control
• Regular backups are maintained to prevent data loss`,
    },
    {
      heading: '5. Data Retention',
      content: `• Active account data is retained as long as your account is active
• Scholarship application records are retained for a minimum of 5 years for audit purposes
• Uploaded documents are retained for the duration of the scholarship verification process
• Upon account deletion request, personal data will be removed within 30 days
• Anonymized statistical data may be retained indefinitely for reporting`,
    },
    {
      heading: '6. Data Sharing',
      content: `Your data may be shared in the following circumstances:
• With scholarship providers for application processing (only relevant application data)
• With authorized government agencies if required by law
• In aggregate, anonymized form for statistical reporting

We do not share your personal information with advertisers or marketing companies.`,
    },
    {
      heading: '7. Your Rights',
      content: `Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to:
• Access your personal information stored in our system
• Correct or update inaccurate personal information
• Request deletion of your personal data (subject to legal retention requirements)
• Object to the processing of your personal data
• Lodge a complaint with the National Privacy Commission

To exercise these rights, contact us at privacy@iskolar.com.`,
    },
    {
      heading: '8. Cookies and Analytics',
      content: `The ISKOLAR web application uses essential cookies for session management and authentication. No tracking or advertising cookies are used.`,
    },
    {
      heading: '9. Changes to This Policy',
      content: `We may update this privacy policy from time to time. Users will be notified of significant changes through the application. Continued use of the application after changes constitutes acceptance of the updated policy.`,
    },
    {
      heading: '10. Contact Information',
      content: `For privacy-related concerns, contact:
ISKOLAR Data Protection Officer
Email: privacy@iskolar.com
SYNERTECH Development Team`,
    },
  ],
};

router.get('/', (_req, res) => {
  res.json(PRIVACY_POLICY);
});

module.exports = router;
