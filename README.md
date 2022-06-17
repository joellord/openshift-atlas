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

These instructions should _technically_ work on a cluster where we have admin rights. 


From the Atlas UI, get your organization id, create a new API key, and save those credentials in your terminal session.

```
export ORG_ID=60c102....bd
export ATLAS_PUBLIC_KEY=iwpd...i
export ATLAS_PRIVATE_KEY=e13debfb-4f35-4...
```

Create a secret with those credentials.

```
oc create secret generic mongodb-atlas-operator-api-key \
    --from-literal="orgId=$ORG_ID" \
    --from-literal="publicApiKey=$ATLAS_PUBLIC_KEY" \
    --from-literal="privateApiKey=$ATLAS_PRIVATE_KEY" \
    -n mongodb-atlas-system
oc label secret mongodb-atlas-operator-api-key atlas.mongodb.com/type=credentials -n mongodb-atlas-system
```

Create a user password to be used with the database. 

```
oc create secret generic atlaspassword --from-literal="password=mernk8s"
oc label secret atlaspassword atlas.mongodb.com/type=credentials
```

Apply the Atlas cluster

```
oc apply -f ./k8s/atlas.yaml
```

Get Connection String

```
oc get secret mern-k8s-db-admin-mern-k8s-user -o json | jq -r '.data | with_entries(.value |= @base64d)'
```

Update the back-end deployment to use this connection string.

```
          env: 
            - name: "CONN_STR"
              valueFrom:
                secretKeyRef:
                  name: mern-k8s-cluster0-mernk8s
                  key: connectionStringStandardSrv
```