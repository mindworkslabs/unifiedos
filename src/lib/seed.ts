/** Documents placed on a newly activated terminal. Written in-universe. */
export function welcomeDocuments(username: string, location: string, slug: string) {
  return [
    {
      title: "RobCo Termlink - Operator's Guide",
      body: `ROBCO INDUSTRIES TERMLINK - OPERATOR'S GUIDE
Terminal: ${location}
Address:  /${slug}
Operator: ${username.toUpperCase()}

Congratulations on the activation of your RobCo Industries terminal.

FILES
Store personal logs, memos and records under Personal Files. Folders may be nested. Select a file to read it; the operator may edit or delete it.

MAIL
Termlink Mail delivers messages instantly to any terminal operator on the network. Address messages by username.

SECURITY
Anyone who knows your terminal address may attempt to access it. RobCo Industries reminds operators that the Termlink maintenance protocol can, in rare circumstances, be exploited by unauthorized persons. A successful intruder can READ your files and mail, but cannot alter or send anything.

Review the Access Log regularly. Adjust your Security Level and Lockout policy under Terminal Configuration.

Thank you for choosing RobCo Industries.`,
    },
    {
      title: "Personal Log - Entry 1",
      body: `Terminal came online today. Everything seems to be working.

Note to self: change the security level before somebody pokes around in here.`,
    },
  ];
}
