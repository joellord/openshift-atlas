# Using MongoDB in OpenShift

This document provides the instructions to use MongoDB in an OpenShift cluster.

## Setup

Create a developer sandbox and install the `oc` cli tool.

From the OpenShift UI, click on your username in the upper right corner. From the dropdown, select `Copy Login Command`. This will open up a new browser tab. Click on "Display Tokens", and look for the `oc` command to login. Copy this command and paste it in your terminal.

```
oc login --token=sha256~...--server=https://api.sandbox-m2.ll9k.p1.openshiftapps.com:6443
```

From the terminal, select a project to work on.

```
oc project %USERNAME%-dev
```

## Deploy a demo app

From the left navigation bar, click on +Add. Click on the "Container Images" card under the "Developer Catalog" section.

Image name from external repository
```
quay.io/ecosystem-appeng/mongo-quickstart:0.0.1-SNAPSHOT
```

Optionally change icon to the Quarkus one

Click create

You'll see the container creating in the topology view. Click the "Open URL" button on the deployment to see it running. In order to reach the app, at the end of the URL, add 
```
/fruits.html
```
You can add a fruit but when you click the SAVE button nothing happens. Well, you might get an event that says gateway timeout. We need to add the database!

## Using the RHODA operator

This operator backed by Red Hat provides you with an easy way to connect to various DBaaS services.

From the left navigation bar, click on +Add. Click on the "All Services" card under the "Developer Catalog" section.

This will open up the "Developer Catalog". In the search bar, enter "Provider Account", and scroll down to find the "Provider Account" card. Click on it to open the side panel, and click on "Create".

In this new screen, fill in the form with the following values.
```
Database provider: MongoDB Atlas Cloud Database Service
Organization ID: Your org Id
Public API Key: You public API key
Private API Key: Your private API key
Name: openshift-mongodb
```

If you have clusters already provisioned you should see a success message, along with a list of all of your MongoDB projects. If none were provisioned you'll see an error message that no instances were found. 

From the +Add menu again, go to "All Services" in "Developer Catalog", and seach for "Atlas". Scroll down and pick "MongoDB Atlas Cloud Database Service". Click on "Add to Topology".

Note: If you don't want to create a new database, you should be able to use the one you created with the Atlas operator.

From the Provider Account dropdown, pick openshift-mongodb. Then, click on the "Create New Database Instance" on the right side, just above the list of existing databases.

In the "Create New Instance" form, use the following values.

Database Provider: MongoDB Atlas Cloud Database Service
Provider Account: openshift-mongodb
Instance Name: fruits-instance
Project Name: fruits-project

In Atlas, you should now see a new project called fruits-project (you might need to refresh the page). If you select that project, you will see a new cluster called fruits-instance being created.

Note: You will need to wait 2-3 minutes for the cluster to be deployed.

Once again, from the +Add menu, go to "All Services" in "Developer Catalog", seach for "Atlas", and pick "MongoDB Atlas Cloud Database Service". Click on "Add to Topology".

In the Provider Account dropdown, pick "openshift-mongodb". From the list of available database instances, pick the newly created "fruits-instance". Click on Add to Topology.

From the Topology view, you should now see the Database as a Service Connection (DBSC).

Hover the "mongo-quickstart" icon. You will see a dotted arrow. Hover that arrow, then drag and drop it inside the square area of the DBSC (just the grey area, not the icon inside of it).

A modal will popup, click on Create to create the service bindings.

The application will redeploy with the new service bindings. 

You should see a failed deployment or an error in the logs: Connection timeout. That's because we have not set any IP access list for our atlas project so Atlas is blocking our pod. Go to the Atlas GUI and enable access from 0.0.0.0, this will cover our openshift cluster (and the world). For a production setting you would either set up a PrivateLink or add the IPs of your OpenShift hosts.
