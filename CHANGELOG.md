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

### Features

* Support output of zip package of Apollo Server
  artifacts ([#70](https://github.com/aws/amazon-neptune-for-graphql/pull/70), [#72](https://github.com/aws/amazon-neptune-for-graphql/pull/72), [#73](https://github.com/aws/amazon-neptune-for-graphql/pull/73), [#75](https://github.com/aws/amazon-neptune-for-graphql/pull/75), [#76](https://github.com/aws/amazon-neptune-for-graphql/pull/76))
* Allow filtering using string comparison operators `eq`, `contains`,
  `startsWith`,
  `endsWith` ([#100](https://github.com/aws/amazon-neptune-for-graphql/pull/100))
* Added pagination support through the addition of an `offset` argument in query
  options which can be used in combination with the existing
  `limit` ([#102](https://github.com/aws/amazon-neptune-for-graphql/pull/102))
* Added support for queries with
  sorting ([#105](https://github.com/aws/amazon-neptune-for-graphql/pull/105))

### Improvements

* Increased graphdb.js test coverage using sample
  data ([#53](https://github.com/aws/amazon-neptune-for-graphql/pull/53))
* Saved the neptune schema to file early so that it can be used for
  troubleshooting ([#56](https://github.com/aws/amazon-neptune-for-graphql/pull/56))
* Alias edges with same label as a
  node ([#57](https://github.com/aws/amazon-neptune-for-graphql/pull/57))
* Cap concurrent requests to get Neptune
  schema ([#58](https://github.com/aws/amazon-neptune-for-graphql/pull/58))
* Honour @id directive on type
  fields ([#60](https://github.com/aws/amazon-neptune-for-graphql/pull/60))
* Changed lambda template to use ECMAScripts
  modules ([#68](https://github.com/aws/amazon-neptune-for-graphql/pull/68))
* Add template file missing from
  packaging ([#71](https://github.com/aws/amazon-neptune-for-graphql/pull/71))
* Separated graphQL schema from resolver
  template ([#79](https://github.com/aws/amazon-neptune-for-graphql/pull/79))
* Added unit tests for resolver and moved resolver integration tests to be unit
  tests ([#83](https://github.com/aws/amazon-neptune-for-graphql/pull/83))
* Set limit on the expensive query which is retrieving distinct to and from
  labels for
  edges ([#89](https://github.com/aws/amazon-neptune-for-graphql/pull/89))
* Added distinct input types for create and update
  mutations ([#93](https://github.com/aws/amazon-neptune-for-graphql/pull/93))
* Enabled mutations for the Apollo
  Server ([#98](https://github.com/aws/amazon-neptune-for-graphql/pull/98))
* Refactored integration tests to be less vulnerable to resolver logic
  changes ([#99](https://github.com/aws/amazon-neptune-for-graphql/pull/99))
* Enabled usage of query fragments with Apollo
  Server ([#103](https://github.com/aws/amazon-neptune-for-graphql/pull/103))
* Compressed resolver schema file and moved schema initialization outside of
  event handlers to improve
  performance ([#111](https://github.com/aws/amazon-neptune-for-graphql/pull/111))
* Updated and proofread outdated
  documentation ([#112](https://github.com/aws/amazon-neptune-for-graphql/pull/107), [#107](https://github.com/aws/amazon-neptune-for-graphql/pull/112))

### Bug Fixes

* Don't cast integers to floats in Neptune
  schema ([#62](https://github.com/aws/amazon-neptune-for-graphql/pull/62))
* Fix query from AppSync with an empty filter
  object ([#61](https://github.com/aws/amazon-neptune-for-graphql/pull/61))
* Retain numeric parameter value type when creating open cypher
  query ([#63](https://github.com/aws/amazon-neptune-for-graphql/pull/63))
* Fixed bug with ID argument type conversion and added Apollo arguments to help
  menu ([#74](https://github.com/aws/amazon-neptune-for-graphql/pull/74))
* Upgraded axios and babel versions to fix security
  warnings ([#90](https://github.com/aws/amazon-neptune-for-graphql/pull/90))
* Fixed failing integration test by excluding `node_modules` from Apollo
  zip ([#94](https://github.com/aws/amazon-neptune-for-graphql/pull/94))
* Fixed enum types in schema to be included in input
  types ([#95](https://github.com/aws/amazon-neptune-for-graphql/pull/95))
* Fixed bug where id fields without @id directives are not accounted
  for ([#96](https://github.com/aws/amazon-neptune-for-graphql/pull/96))
* Fixed custom scalar types in schema to be included in input
  types ([#97](https://github.com/aws/amazon-neptune-for-graphql/pull/97))
* Fixed queries generated from an input schema which retrieve an array to have
  an option parameter with
  limit ([#97](https://github.com/aws/amazon-neptune-for-graphql/pull/97))
* Fixed nested edge subqueries to return an empty array if no results were
  found ([#100](https://github.com/aws/amazon-neptune-for-graphql/pull/100))
* Fixed usage of variables with nested edge
  subqueries ([#100](https://github.com/aws/amazon-neptune-for-graphql/pull/100))
* Fixed cdk output file to contain previously missing files that were necessary
  to execute the lambda
  resolver ([#106](https://github.com/aws/amazon-neptune-for-graphql/pull/106))
* Fixed resolution of nested variables in selection set
  arguments ([#108](https://github.com/aws/amazon-neptune-for-graphql/pull/108))
* Changed resolver to use `graphql` `parse` instead of `graphql-tag` `gql` to
  avoid stale values due to
  caching ([#109](https://github.com/aws/amazon-neptune-for-graphql/pull/109))