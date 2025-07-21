import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

interface DatabaseOperation {
  operation: string;
  table: string;
  query?: any;
  filters?: any;
  data?: any;
  userId?: string;
  duration?: number;
  timestamp: string;
}

class DatabaseLogger {
  private static formatQuery(query: any): string {
    if (!query) return '';
    
    try {
      if (typeof query === 'object') {
        return JSON.stringify(query, null, 2);
      }
      return String(query);
    } catch (error) {
      return '[Unable to serialize query]';
    }
  }

  private static formatData(data: any): string {
    if (!data) return '';
    
    try {
      if (typeof data === 'object') {
        // Limit data output to prevent huge logs
        const keys = Object.keys(data);
        if (keys.length > 10) {
          const limited = Object.fromEntries(keys.slice(0, 10).map(k => [k, data[k]]));
          return JSON.stringify({ ...limited, '...': `${keys.length - 10} more fields` }, null, 2);
        }
        return JSON.stringify(data, null, 2);
      }
      return String(data);
    } catch (error) {
      return '[Unable to serialize data]';
    }
  }

  public static logOperation(operation: DatabaseOperation): void {
    const logLevel = process.env.LOG_LEVEL || 'info';
    
    if (logLevel === 'debug' || logLevel === 'info') {
      console.log('\n🔍 DATABASE OPERATION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📅 Timestamp: ${operation.timestamp}`);
      console.log(`🎯 Operation: ${operation.operation}`);
      console.log(`📊 Table: ${operation.table}`);
      
      if (operation.userId) {
        console.log(`👤 User ID: ${operation.userId}`);
      }
      
      if (operation.filters) {
        console.log(`🔍 Filters:`);
        console.log(this.formatQuery(operation.filters));
      }
      
      if (operation.data) {
        console.log(`📋 Data:`);
        console.log(this.formatData(operation.data));
      }
      
      if (operation.duration !== undefined) {
        console.log(`⏱️ Duration: ${operation.duration}ms`);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  }

  public static logResult(
    operation: string,
    table: string,
    result: PostgrestResponse<any> | PostgrestSingleResponse<any> | { data: any; error: any },
    duration: number,
    userId?: string
  ): void {
    const logLevel = process.env.LOG_LEVEL || 'info';
    
    if (logLevel === 'debug' || logLevel === 'info') {
      console.log('\n📊 DATABASE RESULT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📅 Timestamp: ${new Date().toISOString()}`);
      console.log(`🎯 Operation: ${operation}`);
      console.log(`📊 Table: ${table}`);
      
      if (userId) {
        console.log(`👤 User ID: ${userId}`);
      }
      
      console.log(`⏱️ Duration: ${duration}ms`);
      
      if (result.error) {
        console.log(`❌ Error: ${result.error.message}`);
        console.log(`🔍 Error Details:`, result.error);
      } else {
        console.log(`✅ Status: Success`);
        
        if (Array.isArray(result.data)) {
          console.log(`📈 Records Count: ${result.data.length}`);
          if (result.data.length > 0 && result.data.length <= 3) {
            console.log(`📋 Sample Data:`, this.formatData(result.data));
          } else if (result.data.length > 3) {
            console.log(`📋 Sample Data (first 3):`, this.formatData(result.data.slice(0, 3)));
          }
        } else if (result.data) {
          console.log(`📋 Result Data:`, this.formatData(result.data));
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  }

  public static logError(
    operation: string,
    table: string,
    error: any,
    duration: number,
    userId?: string,
    additionalContext?: any
  ): void {
    console.error('\n💥 DATABASE ERROR');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`📅 Timestamp: ${new Date().toISOString()}`);
    console.error(`🎯 Operation: ${operation}`);
    console.error(`📊 Table: ${table}`);
    
    if (userId) {
      console.error(`👤 User ID: ${userId}`);
    }
    
    console.error(`⏱️ Duration: ${duration}ms`);
    console.error(`❌ Error:`, error);
    
    if (additionalContext) {
      console.error(`🔍 Additional Context:`, this.formatData(additionalContext));
    }
    
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

export default DatabaseLogger;
