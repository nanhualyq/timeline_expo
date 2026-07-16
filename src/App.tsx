import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { migrateDbIfNeeded, type Todo } from './db';

export default function App() {
  return (
    <SQLiteProvider databaseName="test.db" onInit={migrateDbIfNeeded}>
      <View style={styles.container}>
        <Header />
        <Content />
        <StatusBar style="auto" />
      </View>
    </SQLiteProvider>
  );
}

function Header() {
  const db = useSQLiteContext();
  const [version, setVersion] = useState('');

  useEffect(() => {
    async function setup() {
      const result = await db.getFirstAsync<{ 'sqlite_version()': string }>('SELECT sqlite_version()');
      setVersion(result?.['sqlite_version()'] ?? '');
    }
    setup();
  }, []);

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.headerText}>SQLite version: {version}</Text>
    </View>
  );
}

function Content() {
  const db = useSQLiteContext();
  const sql = db.sql;
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    async function load() {
      const result = await sql<Todo>`SELECT * FROM todos`;
      setTodos(result);
    }
    load();
  }, []);

  return (
    <View style={styles.contentContainer}>
      {todos.map((todo, index) => (
        <View style={styles.todoItemContainer} key={index}>
          <Text>{`${todo.intValue} - ${todo.value}`}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    alignItems: 'center',
  },
  todoItemContainer: {
    padding: 8,
  },
});
