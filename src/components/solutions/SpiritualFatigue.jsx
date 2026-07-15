import React from 'react'

export const SpiritualFatigue = ({ data, onChange }) => {
  const updateData = (section, field, value) => {
    onChange({
      ...data,
      [section]: {
        ...(data[section] || {}),
        [field]: value
      }
    })
  }

  // Text Box Comum
  const renderTextBox = (id, title, desc, placeholder) => {
    return (
      <div className="mb-10 md:mb-16 bg-white p-5 md:p-10 rounded-3xl md:rounded-[3rem] border border-slate-100 shadow-sm animate-in fade-in">
        <h3 className="text-2xl font-black text-[#004b4c] mb-2 font-display">{title}</h3>
        <p className="text-slate-500 font-medium mb-8">{desc}</p>
        
        <textarea 
          placeholder={placeholder}
          value={data?.[id]?.text || ''}
          onChange={(e) => updateData(id, 'text', e.target.value)}
          className="w-full min-h-[160px] bg-[#fcfaf5] p-6 rounded-3xl border border-slate-200 outline-none focus:border-[#1ed7a4] focus:bg-white transition-colors text-sm md:text-base text-slate-700 placeholder:text-slate-400 resize-none font-medium leading-relaxed" 
        />
      </div>
    )
  }

  // 04: Notas para o Divino (7 days)
  const renderAct04 = () => {
    const defaultDays = Array(7).fill({ note: '' }).map((_, i) => ({ day: i+1, note: '' }))
    const daysLog = data?.act04?.days || defaultDays

    return (
      <div className="mb-10 md:mb-16 bg-gradient-to-br from-[#1ed7a4] via-[#004b4c] to-slate-900 p-8 md:p-12 rounded-[3rem] shadow-xl text-white animate-in fade-in relative overflow-hidden" style={{animationDelay: '300ms'}}>
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-full h-full bg-white opacity-5 mix-blend-overlay"></div>
        <div className="absolute top-1/4 -right-10 w-64 h-64 bg-white rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        
        <div className="relative z-10">
          <h3 className="text-3xl font-black text-white mb-3 font-display">04. Notas para o Divino</h3>
          <p className="text-[#fcfaf5]/90 font-medium mb-10 text-lg">Pelos próximos 7 dias, escreva uma nota para o Divino compartilhando coisas boas, ruins, fracassos e esperanças. Trate-o da mesma forma que você faria se estivesse desabafando com um amigo de confiança.</p>

          <div className="space-y-6">
            {daysLog.map((d, index) => (
              <div key={`day-${index}`} className="flex flex-col bg-black/10 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden focus-within:border-white/40 focus-within:bg-black/20 transition-all">
                <div className="bg-black/20 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-[#1ed7a4]">Dia {d.day}</span>
                  <span className="text-[10px] font-bold text-white/40">Diário Devocional</span>
                </div>
                <textarea 
                  placeholder="Escreva sua nota aqui..."
                  value={d.note}
                  onChange={(e) => { const n = [...daysLog]; n[index].note = e.target.value; updateData('act04', 'days', n) }}
                  className="w-full min-h-[100px] bg-transparent p-6 outline-none text-sm md:text-base font-medium text-white placeholder:text-white/30 resize-none leading-relaxed" 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      <div className="mb-8 md:mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-[#1ed7a4] uppercase tracking-tighter mb-4 font-display">RECUPERAÇÃO ESPIRITUAL</h2>
        <p className="text-lg text-slate-500 font-medium">Se você obteve alto índice de cansaço espiritual, essa auto reflexão pode ajudá-lo a melhorar esse aspecto.</p>
      </div>

      {renderTextBox('act01', '01. Momentos Difíceis', 'Fragilidade emocional e necessidade de cura são estados que todos nós passamos. Você já passou por algum momento que sentiu que seu coração estava partido? Como superou isso?', 'Resgate na memória o processo de cura pelo qual você passou...')}
      
      {renderTextBox('act02', '02. De volta ao Eixo', 'Há algo na sua vida que parece fora do eixo ou quebrado? É um relacionamento? O trabalho? Ou tempos difíceis tiraram sua capacidade de sonhar? O que você pode fazer para reequilibrar esse aspecto?', 'Identifique os eixos fora do lugar e a ação necessária para o reajuste...')}
      
      {renderTextBox('act03', '03. Pequenos Milagres', 'Pense na primeira vez que você viveu algo inexplicável. Um pequeno ou grande milagre que te livrou de algum problema ou má experiência? Por que você acredita que estava aberto ao espiritual naquele momento?', 'Recorde-se dos livramentos e escreva sobre seu estado de espírito na época...')}

      {/* Ocultado temporariamente a pedido: renderAct04() */}
    </div>
  )
}
