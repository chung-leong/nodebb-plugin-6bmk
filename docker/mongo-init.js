const databases = [
  { name: 'sitename', user: 'sitename', pwd: 'qwerty' },
];

for (const { name, user, pwd } of databases) {
  db = db.getSiblingDB(name);  
  db.createUser({
    user,
    pwd,
    roles: [ { role: 'readWrite', db: name } ],
  });
}
