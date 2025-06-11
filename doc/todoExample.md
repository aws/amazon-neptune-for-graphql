# TODO Example: Starting from a GraphQL schema with no directives
You can start from a GraphQL schema without directives and an empty Neptune database. The utility will inference directives, input, queries and mutations, and create the the GraphQL API. Then, you can use GraphQL to create, mutate and query the data stored in a Neptune database without the need to know how to use a graph query language. 

In this example we start from a TODO GraphQL schema, that you can find in the [samples](https://github.com/aws/amazon-neptune-for-graphql/blob/main/samples/todo.schema.graphql). Includes two types: *Todo* and *Comment*. The *Todo* has a field *comments* as list of *Comment* type.

```graphql
type Todo {    
    name: String
    description: String
    priority: Int
    status: String
    comments: [Comment]
}

type Comment {        
    content: String
}
```

Let's now run this schema through the utility and create the GraphQL API in AWS AppSync. *(Note: pls provide a reachable, empty Neptune database endpoint)*

`neptune-for-graphql --input-schema-file ./samples/todo.schema.graphql --create-update-aws-pipeline --create-update-aws-pipeline-name TodoExample --create-update-aws-pipeline-neptune-endpoint` <*your-neptune-database-endpoint:port*> ` --output-resolver-query-https`

The utility created a new file in the *output* folder called *TodoExample.source.graphql*, and the GraphQL API in AppSync. As you can see below, the utility inferenced:

- In the type *Todo* it added *@relationship* for a new type *CommentEdge*. This is instructing the resolver to connect *Todo* to *Comment* using a graph database edge called *CommentEdge*.
- A new input called *TodoInput* was added to help the queries.
- Two other new input types called *TodoCreateInput* and *TodoUpdateInput* were added to help with mutations.
- The new input *TodoSort* was added to allow specifying sort order for the getNodeTodos query.
- For each type (*Todo*, *Comment*) the utility added two queries. One to retrieve a single type using an id or any of the type fields listed in the input, and the second to retrive multiple values, filtered using the input of that type.
- For each type three mutations: create, update and delete. Selecting the type to delete using an id or the input for that type. These mutation affect the data stored in The Neptune database.
- For connections two mutations: connect and delete. They take as input the ids of the from and to. The ids are of used by Neptune, and the connection are edges in the graph database as mention earlier.

Note: the queries and mutations you see below are recognized by the resolver based on the name pattern. If you need to customize it, first look at the documentation section: [Customize the GraphQL schema with directives](https://github.com/aws/amazon-neptune-for-graphql/blob/main/README.md/#customize-the-graphql-schema-with-directives).

```graphql
enum SortingDirection {
    ASC
    DESC
}

type Todo {
    _id: ID! @id
    name: String
    description: String
    priority: Int
    status: String
    comments(filter: CommentInput, options: Options, sort: [CommentSort!]): [Comment] @relationship(type: "CommentEdge", direction: OUT)
    bestComment: Comment @relationship(type: "CommentEdge", direction: OUT)
    commentEdge: CommentEdge
}

type Comment {
    _id: ID! @id
    content: String
}

input TodoInput {
    _id: ID @id
    name: String
    description: String
    priority: Int
    status: String
}

input TodoCreateInput {
    _id: ID @id
    name: String
    description: String
    priority: Int
    status: String
}

input TodoUpdateInput {
    _id: ID! @id
    name: String
    description: String
    priority: Int
    status: String
}

input TodoSort {
    _id: SortingDirection
    name: SortingDirection
    description: SortingDirection
    priority: SortingDirection
    status: SortingDirection
}

type CommentEdge {
    _id: ID! @id
}

input CommentInput {
    _id: ID @id
    content: String
}

input CommentCreateInput {
    _id: ID @id
    content: String
}

input CommentUpdateInput {
    _id: ID! @id
    content: String
}

input CommentSort {
    _id: SortingDirection
    content: SortingDirection
}

input Options {
    limit: Int
}

input StringScalarFilters {
    eq: String
    contains: String
    endsWith: String
    startsWith: String
}

type Query {
    getNodeTodo(filter: TodoInput): Todo
    getNodeTodos(filter: TodoInput, options: Options, sort: [TodoSort!]): [Todo]
    getNodeComment(filter: CommentInput): Comment
    getNodeComments(filter: CommentInput, options: Options, sort: [CommentSort!]): [Comment]
}

type Mutation {
    createNodeTodo(input: TodoCreateInput!): Todo
    updateNodeTodo(input: TodoUpdateInput!): Todo
    deleteNodeTodo(_id: ID!): Boolean
    connectNodeTodoToNodeCommentEdgeCommentEdge(from_id: ID!, to_id: ID!): CommentEdge
    deleteEdgeCommentEdgeFromTodoToComment(from_id: ID!, to_id: ID!): Boolean
    createNodeComment(input: CommentInput!): Comment
    updateNodeComment(input: CommentInput!): Comment
    deleteNodeComment(_id: ID!): Boolean
}

schema {
  query: Query
  mutation: Mutation
}
```

Now we are ready to create and query our data. 

Below is a snapshot of the AppSync Queries console used to test our new GraphQL API named *TodoExampleAPI*.
In the middle window, the Explorer shows you the queries and mutations. You can then pick a query, the input parameters and the return fields. 

The picture shows the creation of a node type *Todo*, using the *createNodeTodo* mutation.

![Create](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/images/todoCreate.png)

Here, we are querying all the Todos with *getNodeTodos* query.

![Query](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/images/todoGetTodos.png)

After having created one *Comment* using *createNodeComment*, we use the Ids to connect them using the mutation *connectNodeTodoToNodeCommentEdgeCommentEdge*

Here is a nested query being used to retrieve Todos and their attached comments.

![Query](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/images/todoNestedQuery.png)

The solution illustrated in this example is fully functional and can be used as is. If you wish, you can make changes to the *TodoExample.source.graphql* file by following the instructions in the section: *Customize the GraphQL schema with directives*. The edited schema can then be used by running the utility again with the command, `--input-schema-file`. The utility will then modify the GraphQL API.
