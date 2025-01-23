from dotenv import load_dotenv # type: ignore
import os
from supabase import create_client # type: ignore
from datetime import datetime

def read_credentials():
    load_dotenv('../.env')
    return {
        'ftp_user': os.getenv('FTP_USER'),
        'ftp_pass': os.getenv('FTP_PASS'),
        'supabase_url': os.getenv('VITE_SUPABASE_URL'),
        'supabase_key': os.getenv('VITE_SUPABASE_ANON_KEY')
    }

def format_sql_value(v):
    if isinstance(v, (str, datetime)):
        # Use double quotes to avoid escaping issues
        escaped = str(v).replace("'", "''")
        return f"'{escaped}'"
    if v is None:
        return 'NULL'
    return str(v)

def get_schema_sql(supabase, table):
    # Call the stored procedure
    result = supabase.rpc(
        'get_table_schema',
        {'p_table_name': table}
    ).execute()
    
    print(f"\nResult for table {table}:")
    print(result.data)
    
    if not result.data:
        raise Exception(f"No schema information found for table {table}")
        
    # Check for debug information
    if result.data[0]['debug_info']:
        print(f"Debug info: {result.data[0]['debug_info']}")
        
    if result.data[0]['column_name'] is None:
        raise Exception(f"Table error: {result.data[0]['debug_info']}")
    
    # Build CREATE TABLE statement manually
    columns = []
    
    for col in result.data:
        # Skip debug info if column_name is None
        if col['column_name'] is None:
            continue
            
        # Build column definition
        column_def = f"{col['column_name']} {col['data_type']}"
        
        if col['character_maximum_length']:
            column_def += f"({col['character_maximum_length']})"
            
        if col['is_nullable'] == 'NO':
            column_def += " NOT NULL"
            
        if col['column_default']:
            column_def += f" DEFAULT {col['column_default']}"
            
        columns.append(column_def)
    
    create_stmt = f"CREATE TABLE {table} (\n  " + \
                  ",\n  ".join(columns) + \
                  "\n);"
    
    return create_stmt

def list_available_tables(supabase):
    result = supabase.rpc('list_all_tables').execute()
    print("\nAvailable tables:")
    for table in result.data:
        print(f"Schema: {table['schema_name']}, Table: {table['table_name']}, Type: {table['table_type']}")
    return result.data

def get_function_sql(supabase):
    result = supabase.rpc('get_function_definitions').execute()
    
    if not result.data:
        return ""  # No functions found
        
    print("\nFound functions:")
    for func in result.data:
        print(f"- {func['function_name']}")
        
    # Create DROP FUNCTION and CREATE FUNCTION statements
    sql_statements = []
    for func in result.data:
        # Skip the function definitions function itself
        if func['function_name'] == 'get_function_definitions':
            continue
            
        # Create DROP FUNCTION statement
        sql_statements.append(
            f"DROP FUNCTION IF EXISTS {func['function_name']}({func['arguments']}) CASCADE;"
        )
        
        # Create CREATE FUNCTION statement
        create_stmt = f"""CREATE OR REPLACE FUNCTION {func['function_name']}({func['arguments']})
RETURNS {func['return_type']}
LANGUAGE {func['language']}
{func['security_type']}
{func['volatility']} AS
$function$
{func['source_code']}
$function$;"""
        
        sql_statements.append(create_stmt)
        
        # Add GRANT statements
        sql_statements.extend([
            f"GRANT EXECUTE ON FUNCTION {func['function_name']}({func['arguments']}) TO authenticated;",
            f"GRANT EXECUTE ON FUNCTION {func['function_name']}({func['arguments']}) TO anon;",
            f"GRANT EXECUTE ON FUNCTION {func['function_name']}({func['arguments']}) TO service_role;"
        ])
    
    return "\n\n".join(sql_statements)

def get_index_sql(supabase):
    result = supabase.rpc('get_index_definitions').execute()
    
    if not result.data:
        return ""  # No indexes found
        
    print("\nFound indexes:")
    for idx in result.data:
        print(f"- {idx['indexname']} on {idx['tablename']}")
    
    # Create DROP INDEX and CREATE INDEX statements
    sql_statements = []
    for idx in result.data:
        # Skip primary key indexes as they're created with the table
        if idx['indexname'].endswith('_pkey'):
            continue
            
        # Add the index definition (indexdef already includes CREATE INDEX statement)
        sql_statements.append(idx['indexdef'] + ";")
    
    return "\n".join(sql_statements)

def get_trigger_sql(supabase):
    result = supabase.rpc('get_trigger_definitions').execute()
    
    if not result.data:
        return ""  # No triggers found
        
    print("\nFound triggers:")
    for trig in result.data:
        print(f"- {trig['trigger_name']} on {trig['table_name']}")
    
    # Create DROP TRIGGER and CREATE TRIGGER statements
    sql_statements = []
    for trig in result.data:
        # Drop existing trigger
        sql_statements.append(
            f"DROP TRIGGER IF EXISTS {trig['trigger_name']} "
            f"ON {trig['table_name']} CASCADE;"
        )
        
        # Create trigger
        sql_statements.append(trig['trigger_definition'] + ";")
    
    return "\n".join(sql_statements)

def get_view_sql(supabase):
    result = supabase.rpc('get_view_definitions').execute()
    
    if not result.data:
        return ""  # No views found
        
    print("\nFound views:")
    for view in result.data:
        print(f"- {view['viewname']}")
    
    # Create DROP VIEW and CREATE VIEW statements
    sql_statements = []
    for view in result.data:
        # Drop existing view
        sql_statements.append(f"DROP VIEW IF EXISTS {view['viewname']} CASCADE;")
        
        # Create view
        sql_statements.append(f"CREATE VIEW {view['viewname']} AS\n{view['definition']};")
    
    return "\n\n".join(sql_statements)

def main():
    # Create dumps directory if it doesn't exist
    os.makedirs('./dumps', exist_ok=True)
    
    # Define the main backup file path
    main_backup_file = '../db.sql'
    
    # If the main backup file exists, copy it to dumps with timestamp
    if os.path.exists(main_backup_file):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_copy = f'./dumps/db.{timestamp}.sql'
        os.system(f'cp "{main_backup_file}" "{backup_copy}"')
        print(f"Previous backup copied to: {backup_copy}")

    creds = read_credentials()
    supabase = create_client(creds['supabase_url'], creds['supabase_key'])

    # First, let's see what tables are actually available
    available_tables = list_available_tables(supabase)
    
    # Filter for only public schema tables that are BASE TABLE type
    tables = [
        table['table_name'] 
        for table in available_tables 
        if table['schema_name'] == 'public' and table['table_type'] == 'BASE TABLE'
    ]
    
    print("\nTables to backup:")
    print(tables)

    with open(main_backup_file, 'w') as f:
        # Write header
        f.write("-- Backup created at " + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "\n\n")
        f.write("BEGIN;\n\n")

        # First, handle functions
        f.write("-- ============================\n")
        f.write("-- FUNCTIONS\n")
        f.write("-- ============================\n")
        function_sql = get_function_sql(supabase)
        if function_sql:
            f.write(function_sql + "\n\n")

        # Drop existing tables in reverse order (for foreign keys)
        f.write("-- ============================\n")
        f.write("-- DROP TABLES\n")
        f.write("-- ============================\n")
        for table in reversed(tables):
            f.write(f"DROP TABLE IF EXISTS {table} CASCADE;\n")
        f.write("\n")

        # Create tables and constraints
        f.write("-- ============================\n")
        f.write("-- CREATE TABLES\n")
        f.write("-- ============================\n")
        for table in tables:
            schema_sql = get_schema_sql(supabase, table)
            f.write(f"{schema_sql}\n\n")

        # Create indexes (after tables are created and before data is inserted)
        f.write("-- ============================\n")
        f.write("-- INDEXES\n")
        f.write("-- ============================\n")
        index_sql = get_index_sql(supabase)
        if index_sql:
            f.write(index_sql + "\n\n")

        # Create triggers (after tables and before data)
        f.write("-- ============================\n")
        f.write("-- TRIGGERS\n")
        f.write("-- ============================\n")
        trigger_sql = get_trigger_sql(supabase)
        if trigger_sql:
            f.write(trigger_sql + "\n\n")

        # Insert data
        f.write("-- ============================\n")
        f.write("-- TABLE DATA\n")
        f.write("-- ============================\n")
        for table in tables:
            data = supabase.table(table).select('*').execute()
            if data.data:
                f.write(f"\n-- Data for {table}\n")
                for row in data.data:
                    columns = ', '.join(row.keys())
                    values = ', '.join(
                        format_sql_value(v) for v in row.values()
                    )
                    f.write(f"INSERT INTO {table} ({columns}) VALUES ({values});\n")

        # Create views (after all tables and data are created)
        f.write("\n-- ============================\n")
        f.write("-- VIEWS\n")
        f.write("-- ============================\n")
        view_sql = get_view_sql(supabase)
        if view_sql:
            f.write(view_sql + "\n\n")

        f.write("\nCOMMIT;\n")

    print(f"Backup created: {main_backup_file}")

if __name__ == "__main__":
    main()
