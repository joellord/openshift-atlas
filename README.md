Create a developer sandbox and install the `oc` cli tool.

From the OpenShift UI, click on your username in the upper right corner. From the dropdown, select `Copy Login Command`. This will open up a new browser tab. Click on "Display Tokens", and look for the `oc` command to login. Copy this command and paste it in your terminal.

```
oc login --token=sha256~...--server=https://api.sandbox-m2.ll9k.p1.openshiftapps.com:6443
```

From the terminal, select a project to work on.

```
oc project %USERNAME%-dev
```

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

oc label secret mongodb-atlas-operator-api-key atlas.mongodb.com/type=credentials 
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
Create a user password to be used with the database. 

Your Atlas Project is created, you can now go and create a cluster in that project.

Click +Add again, choose the "All Services" for the Developer Catalog. Search for "Atlas" again, but this time, pick "Atlas Cluster". Click "Create" in the panel.

In the Provider Settings, use the following values:

Instance Size Name: M0
Provider Name: TENANT
Backing Provider Name: AWS

You can keep all the other default values.

If you go to your MongoDB Atlas account, you should now see a "Test Atlas Operator" project, and a "test-cluster" that is being deployed. 

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

