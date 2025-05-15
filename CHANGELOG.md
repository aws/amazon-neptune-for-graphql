<!--
Copyright 2023 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at

http://www.apache.org/licenses/LICENSE-2.0

or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
-->

# amazon-neptune-for-graphql CHANGELOG

## Release v1.2.0 (Release Date: TBD)

This release contains new support for Apollo Server integration.

### Bug Fixes

* Don't cast integers to floats in Neptune schema (#62)
* Fix query from AppSync with an empty filter object (#61)
* Retain numeric parameter value type when creating open cypher query (#63)
* Fixed bug with ID argument type conversion and added Apollo arguments to help menu (#74)
* Upgraded axios and babel versions to fix security warnings (#90)
* Fixed failing integration test by excluding `node_modules` from Apollo zip (#94)
* Fixed enum types in schema to be included in input types (#95)

### Features

* Support output of zip package of Apollo Server artifacts (#70, #72, #73, #75, #76)

### Improvements

* Increased graphdb.js test coverage using sample data (#53)
* Saved the neptune schema to file early so that it can be used for troubleshooting (#56)
* Alias edges with same label as a node (#57)
* Cap concurrent requests to get Neptune schema (#58)
* Honour @id directive on type fields (#60)
* Changed lambda template to use ECMAScripts modules (#68)
* Add template file missing from packaging (#71)
* Separated graphQL schema from resolver template (#79)
* Added unit tests for resolver and moved resolver integration tests to be unit tests (#83)
* Set limit on the expensive query which is retrieving distinct to and from labels for edges (#89)
