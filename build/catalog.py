# 100-app catalog seeded from Composio's managed-auth directory (captured 2026-10-29).
# managed=True -> listed under "Composio-managed OAuth available"; False -> "Bring your own OAuth app".
M, B = True, False
CATALOG = [
 # ---- ready guides (12)
 ("Gmail","gmail",M,"Email"),("Outlook","outlook",M,"Email"),("Notion","notion",M,"Docs & knowledge"),
 ("Slack","slack",M,"Chat"),("GitHub","github",M,"Developer"),("Zoom","zoom",M,"Meetings"),
 ("Salesforce","salesforce",M,"CRM"),("LinkedIn","linkedin",M,"Social"),("X (Twitter)","twitter",B,"Social"),
 ("Shopify","shopify",B,"Commerce"),("Xero","xero",B,"Accounting"),("DocuSign","docusign",B,"E-signature"),
 # ---- managed (Composio app available; own app needed for white-label / custom scopes / quota)
 ("Google Calendar","googlecalendar",M,"Calendar"),("Google Drive","googledrive",M,"Files"),
 ("Google Sheets","googlesheets",M,"Spreadsheets"),("Google Docs","googledocs",M,"Docs & knowledge"),
 ("YouTube","youtube",M,"Video"),("Google Ads","googleads",M,"Ads"),("Google Analytics","google_analytics",M,"Analytics"),
 ("Microsoft Teams","microsoft_teams",M,"Chat"),("OneDrive","one_drive",M,"Files"),("SharePoint","share_point",M,"Files"),
 ("Excel","excel",M,"Spreadsheets"),("Dynamics 365","dynamics365",M,"CRM"),("HubSpot","hubspot",M,"CRM"),
 ("Asana","asana",M,"Project management"),("Airtable","airtable",M,"Databases"),("Jira","jira",M,"Project management"),
 ("Confluence","confluence",M,"Docs & knowledge"),("Linear","linear",M,"Project management"),("Trello","trello",M,"Project management"),
 ("ClickUp","clickup",M,"Project management"),("Monday","monday",M,"Project management"),("Wrike","wrike",M,"Project management"),
 ("Todoist","todoist",M,"Tasks"),("Box","box",M,"Files"),("Dropbox","dropbox",M,"Files"),("Figma","figma",M,"Design"),
 ("Canva","canva",M,"Design"),("Miro","miro",M,"Whiteboards"),("Calendly","calendly",M,"Scheduling"),
 ("Discord","discord",M,"Chat"),("Intercom","intercom",M,"Support"),("Zendesk","zendesk",M,"Support"),
 ("Mailchimp","mailchimp",M,"Marketing"),("QuickBooks","quickbooks",M,"Accounting"),("Stripe","stripe",M,"Payments"),
 ("Square","square",M,"Payments"),("Facebook","facebook",M,"Social"),("Instagram","instagram",M,"Social"),
 ("WhatsApp","whatsapp",M,"Messaging"),("Pinterest","pinterest",M,"Social"),("Reddit","reddit",M,"Social"),
 ("TikTok Ads","tiktok_ads",M,"Ads"),("Twitch","twitch",M,"Video"),("Typeform","typeform",M,"Forms"),
 ("GitLab","gitlab",M,"Developer"),("Bitbucket","bitbucket",M,"Developer"),("Sentry","sentry",M,"Developer"),
 ("PagerDuty","pagerduty",M,"Developer"),("Webex","webex",M,"Meetings"),("Gong","gong",M,"Sales"),
 ("Greenhouse","greenhouse",M,"Recruiting"),("Zoho","zoho",M,"CRM"),("Attio","attio",M,"CRM"),
 ("Basecamp","basecamp",M,"Project management"),("Eventbrite","eventbrite",M,"Events"),("Supabase","supabase",M,"Developer"),
 # ---- bring your own (no managed app: developer MUST register)
 ("Pipedrive","pipedrive",B,"CRM"),("Spotify","spotify",B,"Media"),("PayPal","paypal",B,"Payments"),
 ("Meta Ads","metaads",B,"Ads"),("LinkedIn Ads","linkedin_ads",B,"Ads"),("Microsoft Word","microsoft_word",B,"Docs & knowledge"),
 ("Microsoft To Do","microsoft_todo",B,"Tasks"),("Power BI","microsoft_power_bi",B,"Analytics"),("ServiceNow","servicenow",B,"IT service"),
 ("Workday","workday",B,"HR"),("NetSuite","netsuite",B,"ERP"),("Snowflake","snowflake",B,"Data"),
 ("Databricks","databricks",B,"Data"),("Datadog","datadog",B,"Developer"),("Smartsheet","smartsheet",B,"Spreadsheets"),
 ("Webflow","webflow",B,"Websites"),("Wix","wix",B,"Websites"),("WordPress.com","wordpress_com",B,"Websites"),
 ("Vimeo","vimeo",B,"Video"),("TikTok","tiktok",B,"Social"),("Threads","threads",B,"Social"),
 ("Gusto","gusto",B,"HR"),("Deel","deel",B,"HR"),("BambooHR","bamboohr",B,"HR"),
 ("Klaviyo","klaviyo",B,"Marketing"),("Front","front",B,"Support"),("Vercel","vercel",B,"Developer"),
 ("eBay","ebay",B,"Commerce"),("Google Chat","google_chat",B,"Chat"),("Google Forms","googleforms",B,"Forms"),
 ("Razorpay","razorpay",B,"Payments"),("Lever","lever",B,"Recruiting"),
]
