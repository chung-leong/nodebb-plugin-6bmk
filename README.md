## Installation

This tutorial teaches you how to set up a server running NodeBB with the 6bmk plugin 
on Digitial Ocean, one of the least expensive cloud providers. For less than the 
price of a cup of coffee each month you can have your own little playground! We will
set up the server such that it will be capable of running multiple discussion boards.

First of all, you'll need a domain name. Purchase one at a registrar such as 
[GoDaddy](https://godaddy.com). Since you're not running a commercial operation, it 
doesn't need to be a ".com" name. Consider a name with a non-traditional 
ending (e.g. *workaholic.ninja*).

Next, create an account at [Digital Ocean](https://digitalocean.com) if you're not 
already a customer. Create a droplet with the Ubuntu operation system and 1 GB 
RAM (installation will fail when memory is half that). If you're unfamiliar with 
the process, watch this 
[helpful tutorial video](https://www.youtube.com/watch?v=g1-nQ9pvbxc&t=5s).

After the droplet is created, connect it to your domain name. Go to "Networking" 
and add a rule for the root domain and another that matches all subdomains 
(e.g. *workaholic.ninja* and another for **.workaholic.ninja*). Consult this 
[Digital Ocean tutorial video](https://www.youtube.com/watch?v=ILwEMBjobAA) for 
guidance. You will also need to assign Digital Ocean's DNS server to the domain
at your registrar. 

Wait some time for the changes to propagate across the Internet. It could take 
an hour or two. When it comes accessible finally, connect to the droplet 
using SSH and begin configuring it. If you're a Windows user and aren't 
familiar with Linux, follow this 
[tutorial](https://docs.digitalocean.com/products/droplets/how-to/connect-with-ssh/putty/).

### Setting up web server

Installing Nginx, the most popular web server software currently, is easy 
enough. Simply enter the following command into the command prompt and press
ENTER:

```sh
apt-get install nginx
```

Run the following command to start the server:

```sh
systemctl start nginx
```

At this point you should be able to see a generic page when you visit 
`http://[your domain name]` using your web browser. Note that the web address must 
start with "http" and not "https" as SSL is not enabled yet.

To enable SSL (Secure Sockets Layer) protection, you will need to install 
[certbot](https://certbot.eff.org/). Simply type in the following command and press
ENTER:

```sh
apt-get install certbot
```

Then run the following to install the Digital Ocean plugin:

```sh
apt install python3-certbot-dns-digitalocean
```

And then this command to verify its presense:

```sh
certbot plugins
```

Log into Digital Ocean and create an Person Access Token token that enables your server 
to make DNS changes on your behalf. This is an required part of obtaining an SSL 
certificate. Simply click on API on the side navigation, the "Generate New Token" 
button, and follow the instructions. The token will need to be READ-WRITE.

If you need a little more hand holding, watch this 
[video on YouTube](https://www.youtube.com/watch?v=Er7bp-JCc-8&t=9s).

Once you have created the token and have copied it into your computer's clipboard, 
run the following command to create a text file:

```sh
nano ~/certbot-creds.ini
```

Then paste the token into it:

```
dns_digitalocean_token = dop_v1_235dea9d8856f5b0df87af5edc7b4491a92745ef617073f3ed8820b5a10c80d2
```

After saving the file and exiting the editor (Ctrl-O, Ctrl-X), run the following 
command to restrict access to the token:

```sh
chmod 600 ~/certbot-creds.ini
```

With the credentials in place, run the following command, replacing first the domain name 
with your own:

```sh
certbot certonly \
  --dns-digitalocean \
  --dns-digitalocean-credentials ~/certbot-creds.ini \
  -d '*.workaholic.ninja' -d 'workaholic.ninja'
```

If you run into problems, please consult the 
[original Digital Ocean article](https://www.digitalocean.com/community/tutorials/how-to-create-let-s-encrypt-wildcard-certificates-with-certbot) from which the above
information was taken.

Otherwise you should have a working certifcate at this point. Certbot will 
automatically renew it prior to its expiration date. Now we need to configure 
Nginx to use the certifcate. Run the follow command to open a new config file:

```sh
nano /etc/nginx/conf.d/certbot
```

Paste in the following text and replace the domain name with your own:

```sh
ssl_certificate /etc/letsencrypt/live/workaholic.ninja/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/workaholic.ninja/privkey.pem;
```

Press Ctrl-O to save and Ctrl-X to exit, then open the config file for the default 
site:

```sh
nano /etc/nginx/sites-available/default
```

Scroll down and uncomment the following lines:

```nginx
        # SSL configuration
        #
        listen 443 ssl default_server;
        listen [::]:443 ssl default_server;
```

Press Ctrl-O to save and Ctrl-X to exit, then open Nginx's main config file:

```sh
nano /etc/nginx/nginx.conf
```

Scroll down and add `client_max_body_size 10m` to enlarge the file upload size:

```nginx
        ##
        # Basic Settings
        ##

        sendfile on;
        tcp_nopush on;
        types_hash_max_size 2048;
        client_max_body_size 10m;
```

Without the change mobile users will not be able to post photos taken using 
their phones (which are usually hi-res).

Scroll down further and uncomment the line with the `gzip_types` directive:

```nginx
        gzip on;

        # gzip_vary on;
        # gzip_proxied any;
        # gzip_comp_level 6;
        # gzip_buffers 16 8k;
        # gzip_http_version 1.1;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

This tells Nginx to employ compression on JavaScript and CSS files, significantly 
reducing the time required for the web site to load.

Restart Nginx with the following command:

```sh
systemctl restart nginx
```

At this point your should be able to reach `https://[your domain name]`. 
A visit to `https://test.[your domain name]` should yield the same page.

Run the following command so Nginx will launch automatically on system startup:

```sh
systemctl enable nginx
```

### Setting up database server

The process of installing MongoDB is slightly more involved as it's not available 
in Ubuntu's software repository. We need to obtain it from mongodb.org instead. 
We'll first add the signing key for MongoDB version 6:

```sh
apt-key adv \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv 39BD841E4BE5FB195A65400E6A26B1AE64C3C388
```

Then we add the repository of mongodb.org to our system:

```sh
echo "deb [ arch=amd64,arm64 signed=/usr/share/keyrings/mongodb-server-6.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
```

Update the list of software and install the suite:

```sh
apt-get update
apt-get install -y mongodb-org
```

Before firing up the database, we'll increase the system's maximum map count 
so we don't receive a warning:

```sh
echo "vm.max_map_count=128000" >> /etc/sysctl.conf
sysctl -p
```

Run the following command to start MongoDB:

```sh
systemctl start mongod
```

Start the Mongo shell so we can add the root user:

```sh
mongosh
```

Run the following:

```js
use admin
db.createUser({ 
  user: "admin", 
  pwd: "<Enter a secure password>", 
  roles: [ 
    { role: "root", db: "admin" } 
  ] 
})
```

Type `exit` to exit the shell. Use nano to add the following lines to `/etc/mongod.conf`:

```
security:
  authorization: enabled
```

Then restart MongoDB:

```sh
systemctl restart mongod
```

Run the following command so MongoDB will launch automatically on system startup:

```sh
systemctl enable mongod
```

### Setting up NodeBB

The first thing we need to do is install Node.js:

```sh
apt-get install nodejs npm
```

Then we create the user that Node will run under (running Node as root is a definite no-no):

```sh
useradd node -m
```

Then the directory that will hold the NodeBB codebase:

```sh
mkdir -p /usr/src/nodebb && chown node:node /usr/src/nodebb 
```

We need to transfer ownership to the Node user because NodeBB will modify its own codebase. 
It needs to have full write access.

We use Git to download the source code, running as `node` to ensure that the account owns 
all the files:

```sh
cd /usr/src/nodebb
sudo -u node git clone \
  --depth 1 \
  --branch v3.0.0-rc.2 \
  https://github.com/NodeBB/NodeBB.git \
  .
```

Next we install the dependent modules used by NodeBB:

```sh
sudo -u node npm install --omit=dev
```

This step can be quite time-consuming. When it finishes, we proceed to install the 
6bmk plugin and the sendgrid plugin:

```sh
sudo -u node npm install \
  nodebb-plugin-6bmk \
  nodebb-plugin-emailer-sendgrid
```

Sendgrid is a commercial e-mailing service that offers a free tier for low-volume usage
scenarios. We'll use it so our site can send password-reset e-mails.

### Adding a board

Our server is designed to host multiple instances of NodeBB. To add a board, we need the following:

1. Database for the board
2. Copy of NodeBB
3. NodeBB systemd service file
4. Nginx virtual server config file

Suppose we wish to create a board that will appear at `https://skinny.workaholic.ninja`. To create
the first item on the list, we enter the Mongo shell by running the following:

```sh
mongosh -u root -p <Enter a secure password>
```

For simplicity sake we'll name both the database and the database user "skinny". We run the 
following code to create the database user:

```js
use skinny
db.createUser({ 
  user: "skinny", 
  pwd: "<password>", 
  roles: [ 
   { role: "readWrite", db: "skinny" }, 
   { role: "clusterMonitor", db: "admin" } 
  ] 
})
```

To create a copy of NodeBB, we could simply copy all the files from `/usr/src/nodebb`. That would 
be a rather wasteful approach, however. We'll instead use 
[OverlayFS](https://www.educative.io/answers/what-is-overlayfs) to create a "shadow copy" of the 
NodeBB codebase. 

We will first create a directory that holds everything related to this particular board:

```sh
mkdir /home/node/skinny
```

Then we create the three directories needed by OverlayFS: the upper overlay (holding changes), 
the work directory, and the actual mount point:

```sh
cd /home/node/skinny
mkdir .diff .work nodebb && chown -R node:node .
```

Using nano, we add the following line to `/etc/fstab`:

```
overlay /home/node/skinny/nodebb overlay noauto,x-systemd.automount,lowerdir=/usr/src/nodebb,upperdir=/home/node/skinny/.diff,workdir=/home/node/skinny/.work 0 0
```

We then tell the system to reload its configuration:

```sh
systemctl daemon-reload
```

We're then ready to mount the overlay file system:

```sh
mount /home/node/skinny/nodebb
```

At this point `/home/node/skinny/nodebb` will contain everything in `/usr/src/nodebb` 
although no physical copying of the files had actually occurred. We're now ready to start the 
NodeBB setup process:

```sh
cd ./nodebb
sudo -u node ./nodebb setup
```

The setup script will ask you a series of questions:

```
URL used to access this NodeBB (http://localhost:4567) https://skinny.workaholic.ninja
Please enter a NodeBB secret (563f0b22-638e-47f4-8b0f-ee8478c736ce) 
Would you like to submit anonymous plugin usage to nbbpm? (yes) 
Which database to use (mongo) 
Now configuring mongo database:
MongoDB connection URI: (leave blank if you wish to specify host, port, username/password and database individually)
Format: mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]] 
Host IP or address of your MongoDB instance (127.0.0.1) 
Host port of your MongoDB instance (27017) 
MongoDB username skinny
Password of your MongoDB database ********
MongoDB database name (nodebb) skinny
```

If the install script manages to connect to the database server, it'll create the necessary 
database structure, then ask you to provide login information for the admin user:

```
Administrator username ninja-sysop
Administrator email address somedude1234@gmail.com
Password ********
Confirm Password ********
```

Once that's done, NodeBB will proceed to build the web-sites (mainly JavaScript files). The 
process will take a minute or so.

If the board is not the first one, you would need to open `nodebb/config.json` and manually assign  a different port number to it:

```json
{
    "url": "https://chunky.workaholic.ninja",
    "secret": "433f0b22-538e-37f4-1b0f-ae8478c736ce",
    "database": "mongo",
    "mongo": {
        "host": "127.0.0.1",
        "port": "27017",
        "username": "chunky",
        "password": "password",
        "database": "chunky",
        "uri": ""
    },
    "port": 4568
}
```

Okay, NodeBB is ready to go. The next item on our list is the systemd service file, used to start 
this instance of NodeBB automatically. We open `/home/node/skinny/nodebb.service` and 
insert the following content:

```ini
[Unit]
Description=NodeBB (skinny.workaholic.ninja)
Documentation=https://docs.nodebb.org
After=system.slice multi-user.target mongod.service

[Service]
Type=forking
User=node

WorkingDirectory=/home/node/skinny/nodebb
PIDFile=/home/node/skinny/nodebb/pidfile
ExecStart=/usr/bin/env node loader.js
Restart=always

[Install]
WantedBy=multi-user.target
```

We then place a symbolic link to the file in systemd's config directory:

```sh
ln -s /home/node/skinny/nodebb.service /etc/systemd/system/nodebb.skinny.service
```

We should now be able to start the service:

```sh
systemctl start nodebb.skinny
```

We can check if the NodeBB is working by running the following:

```sh
wget -qO- http://localhost:4567
```

It should retrieve an HTML file.

If everything looks okay, we tell systemd to autostart the service:

```sh
systemctl enable nodebb.skinny
```

We're almost there! Now we just need to tell Nginx to relay NodeBB's output to 
the Internet. We open `/home/node/skinny/nginx.conf` and insert the following 
content:

```nginx
server {
  listen 80;
  listen 443 ssl http2;
  server_name skinny.workaholic.ninja;

  location / {
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Host $http_host;
    proxy_set_header X-NginX-Proxy true;

    proxy_pass http://localhost:4567;
    proxy_redirect off;

    # Socket.IO Support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Be sure to adjust the port number if the default (4567) is not being used.

Now we just need to symlink this file to Nginx's config directory:

```sh
ln -s /home/node/skinny/nginx.conf /etc/nginx/sites-enabled/skinny.workaholic.ninja
```

Then tell Nginx to reload it configuration:

```sh
systemctl reload nginx
```

NodeBB should be fully functional at the proper web address at this point.

### Configuring the board