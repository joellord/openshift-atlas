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

Create the new application back-end.

```
oc apply -f ./k8s/back.yaml
```

You can expose this service and create a route.

```
oc expose service mern-k8s-back
```

You can use `oc get routes` to see the newly created route. You will be able to curl this URL to check the status of the server.

```
curl http://$(oc get routes | awk 'FNR==2{print $2}')/healthz
```

You should see that the server is up, but the database is not connected. That's ok, we'll need to get the connection string from the Atlas cluster later on. If you want to test it with an existing cluster, you can update the environment variable.

```
oc set env deployment/mern-k8s-back CONN_STR=AN_EXISTING_CONNECTION_STRING
```

If you try a curl again with a valid connection string, you should see the database status updated to `true`.

Deploy the front-end using the yaml file, and expose the service.

```
oc apply -f ./k8s/front.yaml
oc expose service/mern-k8s-front
```

If you look at the OpenShift UI, you will see a little link icon on the circle representing the front-end deployment. If you click on it, it should open the UI. It won't connect to the back-end though. To do so, you will need to specify the BASE_URL of the back end, which is the route to the back-end service.

```
oc set env deployment/mern-k8s-front BASE_URL=http://$(oc get routes | awk 'FNR==2{print $2}')
```

The application is now created, but we need to connect the Atlas cluster to OpenShift, and use this new AtlasCluster object to provide us with a connection string. 

## Using the Atlas Operator

From the Atlas UI, get your organization id, create a new API key, and save those credentials in your terminal session. You can use the built-in terminal in OpenShift to run these commands.

```
export ORG_ID=60c102....bd
export ATLAS_PUBLIC_KEY=iwpd...i
export ATLAS_PRIVATE_KEY=e13debfb-4f35-4...
```

Create a secret with those credentials. 

```
oc create secret generic openshift-mongodb \
    --from-literal="orgId=$ORG_ID" \
    --from-literal="publicApiKey=$ATLAS_PUBLIC_KEY" \
    --from-literal="privateApiKey=$ATLAS_PRIVATE_KEY"

oc label secret openshift-mongodb atlas.mongodb.com/type=credentials 
```

Also, you will need to create a password for the Atlas User you will create later.

```
oc create secret generic openshift-mongodb-password --from-literal="password=openshift"

oc label secret openshift-mongodb-password atlas.mongodb.com/type=credentials
```

We can do everything else in the OpenShift UI.

In the left navigation bar, choose +Add, and scroll down to "Developer Catalog" -> "All Services". This should open a new page called "Developer Catalog" and your cursor should be in the search box already.

Search for "Atlas", click on the Card titled "Atlas Project". A side panel will open, click "Create".

Keep the default values for the names and labels. 
Click on Connect Secret Ref and in the text box, enter `openshift-mongodb`, which is the name of the secret you just created.
Click on the Project Ip Access List and in the Ip Address field, enter `0.0.0.0`.

Your Atlas Project is created, you can now go and create a cluster in that project.

Click +Add again, choose the "All Services" for the Developer Catalog. Search for "Atlas" again, but this time, pick "Atlas Cluster". Click "Create" in the panel.

In the Provider Settings, use the following values:

Instance Size Name: M0
Provider Name: TENANT
Backing Provider Name: AWS

You can keep all the other default values.

If you go to your MongoDB Atlas account, you should now see a "Test Atlas Operator" project, and a "test-cluster" that is being provisioned. 

Finally, you need to create a new Atlas Database User. Click +Add, find the "All Services" under the "Developer Catalog", search for "Atlas", click on "Atlas Database User", and click on Create.

In Password Secret Ref, fill the text box.

Name: openshift-mongodb-password

And change the username.

Username: user

Click Save to create the new database user.

Everything is now in place, and you should have access to a new Secret that will provide you with everything you need to connect to your cluster.

In the left navigation bar, look for secrets. Scoll down the list to find the secret named `test-atlas-operator-project-test-cluster-user` and click on it. From this screen, scroll to the "Data" section, you should see the connection string data (look for the "Reveal Values" button on the right to actually show the values).

Now that we have this connection string, you can go and edit the deployment for the back end so that it uses our newly created database, without exposing any of our credentials.

Go to the Topology view (from the left navigation bar). Click on the `mern-k8s-back` icon. This will open up a right panel. From the "Actions" dropdown, select "Edit Deployment".

(If you see the YAML details, click on the "Form View" radio button at the top)

Scroll down to the "Environment variables" section, and remove the "CONN_STR" variable.

Then click on + Add from ConfigMap or Secret. Give this new environment variable the name CONN_STR, select the "test-atlas-operator-project-test-cluster-user" secret, and the connectionStringStandardSrv field.

Click "Save". This will bring you back to the topology view, and voila! You will see the app being redeployed. If you test the application, it will now be on the new cluster. 

You can add a new entry in the guestbook. Refresh the page to show it persisted. Open the Atlas UI in the newly created cluster, and show the data.

## Using the RHODA operator

This operator backed by Red Hat provides you with an easy way to connect to various DBaaS services.

From the left navigation bar, click on +Add. Click on the "All Services" card under the "Developer Catalog" section.

This will open up the "Developer Catalog". In the search bar, enter "Provider Account", and scroll down to find the "Provider Account" card. Click on it to open the side panel, and click on "Create".

In this new screen, fill in the form with the following values.

Database provider: MongoDB Atlas Cloud Database Service
Organization ID: Your org Id
Public API Key: You public API key
Private API Key: Your private API key
Name: openshift-mongodb

You should see a success message, along with a list of all of your MongoDB projects.

From the +Add menu again, go to "All Services" in "Developer Catalog", and seach for "Atlas". Scroll down and pick "MongoDB Atlas Cloud Database Service". Click on "Add to Topology".

Note: If you don't want to create a new database, you should be able to use the one you created with the Atlas operator.

From the Provider Account dropdown, pick openshift-mongodb. Then, click on the "Create New Database Instance" on the right side, just above the list of existing databases.

In the "Create New Instance" form, use the following values.

Database Provider: MongoDB Atlas Cloud Database Service
Provider Account: openshift-mongodb
Instance Name: my-new-instance
Project Name: my-new-project

In Atlas, you should now see a new project called my-new-project (you might need to fresh the page). If you select that project, you will see a new cluster called my-new-instance being created.

Note: You will need to wait 2-3 minutes for the cluster to be deployed.

Once again, from the +Add menu, go to "All Services" in "Developer Catalog", seach for "Atlas", and pick "MongoDB Atlas Cloud Database Service". Click on "Add to Topology".

In the Provider Account dropdown, pick "openshift-mongodb". From the list of available database instances, pick the newly created "my-new-instance". Click on Add to Topology.

From the Topology view, you should now see the Database as a Service Connection (DBSC).

Note: For this part, you will need to change the base image for the back end server. This new image uses the same code, but uses the Kubernetes Service Bindings plugins. I added the code for the back-end before and after to this repo so you can compare both files. They are very similar. To use this new image, click on the mern-k8s-back icon in the Topology view. From the Actions dropdown, choose "Edit Deployment". In the Form View, look for the Image name and change it from joellord/mern-k8s-back to
Image Name: joellord/mern-k8s-back-binding
This will redeploy the app with this new image.

Back to the topology view with the new image, hover the "mern-k8s-back" icon. You will see a dotted arrow. Hover that arrow, then drag and drop it inside the square area of the DBSC (just the grey area, not the icon inside of it).

A modal will popup, click on Create to create the service bindings.

The application will redeploy with the new service bindings.

Everything should now work again.

Note: In order to use this new cluster, you will need to create a "mern-k8s" database and a "entries" collection in your cluster.