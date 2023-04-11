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

### Setting up Web Server

Installing Nginx, the most popular web server software currently, is easy 
enough. Simply enter the following command into the command prompt and press
ENTER:

```sh
apt-get install nginx
```

Run the following command to start the server automatically:

```sh
systemctl enable nginx
```

At this point you should be able to see a generic page when you visit 
**http://**[your domain name] using your web browser. Note that the web address must 
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

Once 

```sh
certbot certonly \
  --dns-digitalocean \
  --dns-digitalocean-credentials ~/certbot-creds.ini \
  -d '*.workaholic.ninja' -d 'workaholic.ninja'
```

If you run into problems, please consult the 
[original Digital Ocean article](https://www.digitalocean.com/community/tutorials/how-to-create-let-s-encrypt-wildcard-certificates-with-certbot), from which the above
information was taken.

### Setting up Database 

```sh
apt-key adv \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv 39BD841E4BE5FB195A65400E6A26B1AE64C3C388
```

```sh
echo "deb [ arch=amd64,arm64 signed=/usr/share/keyrings/mongodb-server-6.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
```

```sh
apt-get update
```

```sh
apt-get install -y mongodb-org
```

```sh
echo "vm.max_map_count=128000" >> /etc/sysctl.conf
```

### Setting up NodeBB

```sh
apt-get install nodejs npm
```

```sh
git clone \
  --depth 1 \
  --branch v3.0.0-rc.2 \
  https://github.com/NodeBB/NodeBB.git \
  /usr/src/nodebb
```

```sh
npm install --omit=dev
```

```sh
npm install \
  nodebb-plugin-6bmk \
  nodebb-plugin-emailer-sendgrid
```

```sh
useradd node -m
```
