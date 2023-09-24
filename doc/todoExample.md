# TODO Example: Starting from a GraphQL schema with no directives
You can start from a GraphQL schema without directives and an empty Neptune database. The utility will inference directives, input, queries and mutations, and create the the GraphQL API. Then, you can use GraphQL to create, mutate and query the data stored in a Neptune database without the need of knowing how to use a graph query language. 

In this example we start from a TODO GraphQL schema, that you can find in the [samples](/samples/todo.schema.graphql), which include two types: *Todo* and *Comment*. The *Todo* includes a field *comments* as list of *Comment* type.

```graphql
type Todo {
    id: ID!
    name: String
    description: String
    priority: Int
    status: String
    comments: [Comment]
}

type Comment {
    id: ID!    
    content: String
}
```

Let's now run this schema through the utility and create the GraphQL API in AWS AppSync. *(Note: pls provide a reachable, empty Neptune database endpoint)*

`neptune-for-graphql --input-schema-file ./samples/todo.schema.graphql --create-update-aws-pipeline --create-update-aws-pipeline-name TodoExample --create-update-aws-pipeline-neptune-endpoint` *your-neptune-database-endpoint:port* 

Te utility created a new file in the *output* folder called *TodoExample.source.graphql*, and the GraphQL API in AppSync. As you can see below, the utility inferenced:

- In the type *Todo* it added *@relationship* for a new type *CommentEdge*. This is instructing the resolver to connect *Todo* to *Comment* using a graph database edge called *CommentEdge*.
- A new input called *TodoInput* was added to help the queries and the mutations.
- For each type (*Todo*, *Comment*) the utility added two queries. One to retrive a single type using an id or any of the type fields listed in the input, and the second to retrive multiple values, filtered using the input of that type.
- For each type three mutations: create, update and delete. Selecting the type to delete using an id or the input for that type. These mutation affect the data stored in The Neptune database.
- For connections two mutations: connect and delete. They take as input the ids of the from and to. The ids are of used by Neptune, and the connection are edges in the graph database as mention earlier.

Note: the queries and mutations you see below are recognized by the resolver based on the name pattern. If you need to customize it, first look at the documentation section: *Customize the GraphQL schema with directives.*

```graphql
type Todo {
  id: ID!
  name: String
  description: String
  priority: Int
  status: String
  comments: [Comment] @relationship(type: "CommentEdge", direction: OUT)
}

type Comment {
  id: ID!
  content: String
}

input TodoInput {
  name: String
  description: String
  priority: Int
  status: String
}

type CommentEdge {
  id: ID!
}

input CommentInput {
  content: String
}

type Query {
  getNodeTodo(id: ID, filter: TodoInput): Todo
  getNodeTodos(filter: TodoInput): [Todo]
  getNodeComment(id: ID, filter: CommentInput): Comment
  getNodeComments(filter: CommentInput): [Comment]
}

type Mutation {
  createNodeTodo(input: TodoInput!): Todo
  updateNodeTodo(id: ID!, input: TodoInput!): Todo
  deleteNodeTodo(id: ID!): Boolean
  connectNodeTodoToNodeCommentEdgeCommentEdge(from: ID!, to: ID!): CommentEdge
  deleteEdgeCommentEdgeFromTodoToComment(from: ID!, to: ID!): Boolean
  createNodeComment(input: CommentInput!): Comment
  updateNodeComment(id: ID!, input: CommentInput!): Comment
  deleteNodeComment(id: ID!): Boolean
}

schema {
  query: Query
  mutation: Mutation
}
```

Now we are ready to create and query our data. 

Here below snapshot of the AppSync Queries console used to test our new GraphQL API named *TodoExampleAPI*.
In the middle window, the Explorer shows you the queries and mutations. You can then pick a query, the input parameters and the return fields. 

The picture shows the creation of a node type *Todo*, using *createNodeTodo* mutation.

![Create](/doc/images/todoCreate.jpg)

Here quering all the Todos with *getNodeTodos* query.

![Query](/doc/images/todoGetTodos.jpg)

After having created one *Comment* using *createNodeComment*, we used the Ids connect them using the mutation *connectNodeTodoToNodeCommentEdgeCommentEdge*

Here a nested query to retreive Todos and their attached comments.

![Query](/doc/images/todoNestedQuery.JPG)

The solution illustrated in this example if functional and can be used as is. If you wish you can make changes to the *TodoExample.source.graphql* following the direction in the section: *Customize the GraphQL schema with directives*. The edited schema can then be use as `--input-schema-file` running the utility again. The utility will then modify the GraphQL API.
