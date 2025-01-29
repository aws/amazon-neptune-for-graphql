export function sortNeptuneSchema(schema) {
    const { nodeStructures, edgeStructures } = schema;

    nodeStructures.forEach(
        structure => structure.properties.sort((a, b) => a.name.localeCompare(b.name))
    );
    edgeStructures.forEach(
        structure => structure.directions.sort(
            (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
        )
    );

    nodeStructures.sort((a, b) => a.label.localeCompare(b.label));
    edgeStructures.sort((a, b) => a.label.localeCompare(b.label));

    return schema;
}
